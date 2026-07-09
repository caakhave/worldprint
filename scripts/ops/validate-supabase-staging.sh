#!/usr/bin/env bash
set -euo pipefail
set +x

usage() {
  cat <<'USAGE'
Usage:
  scripts/ops/validate-supabase-staging.sh [--operator-audit|--full]

Runs read-only Supabase validation SQL against the staging database.

Required environment:
  SUPABASE_STAGING_DB_URL must be exported by the operator before running.

Safety:
  - This script never prints the database URL.
  - This script does not load .env files.
  - This script does not use linked Supabase project state.
  - Prefer the direct Supabase database connection string.
  - Transaction pooler URLs may fail because validation uses prepared query execution.
  - Do not commit raw SQL output from the broader operator audit.
USAGE
}

mode="rls"
case "${1:-}" in
  "" | "--rls")
    mode="rls"
    ;;
  "--operator-audit" | "--full")
    mode="operator-audit"
    ;;
  "-h" | "--help")
    usage
    exit 0
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage >&2
    exit 64
    ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/../.." && pwd)"
cd "$repo_root"

dangerous_env_names=(
  DATABASE_URL
  DATABASE_URL_PRODUCTION
  POSTGRES_DATABASE_URL
  POSTGRES_PRISMA_URL
  POSTGRES_URL
  POSTGRES_URL_NON_POOLING
  PROD_DATABASE_URL
  PROD_POSTGRES_URL
  PRODUCTION_DATABASE_URL
  PRODUCTION_POSTGRES_URL
  SUPABASE_DB_URL
  SUPABASE_PROD_DB_URL
  SUPABASE_PRODUCTION_DB_URL
)

offending_env_names=()
for env_name in "${dangerous_env_names[@]}"; do
  if [[ -n "${!env_name+x}" ]]; then
    offending_env_names+=("$env_name")
  fi
done

while IFS='=' read -r env_name _env_value; do
  if [[ "$env_name" == "SUPABASE_STAGING_DB_URL" ]]; then
    continue
  fi

  if [[ "$env_name" =~ ^PG[A-Z0-9_]*$ || "$env_name" =~ ^POSTGRES(_|$) ]]; then
    already_listed=false
    for listed_name in "${offending_env_names[@]}"; do
      if [[ "$listed_name" == "$env_name" ]]; then
        already_listed=true
        break
      fi
    done
    if [[ "$already_listed" == false ]]; then
      offending_env_names+=("$env_name")
    fi
  fi
done < <(env)

if (( ${#offending_env_names[@]} > 0 )); then
  joined_names="${offending_env_names[0]}"
  for env_name in "${offending_env_names[@]:1}"; do
    joined_names+=", $env_name"
  done
  echo "Refusing because these production/generic DB variables are present: $joined_names" >&2
  echo "Unset those variables before running staging validation." >&2
  exit 1
fi

if [[ -z "${SUPABASE_STAGING_DB_URL:-}" ]]; then
  echo "Missing SUPABASE_STAGING_DB_URL." >&2
  echo "Export SUPABASE_STAGING_DB_URL explicitly without printing it, then rerun." >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required for staging validation, but it was not found on PATH." >&2
  exit 127
fi

if [[ "$SUPABASE_STAGING_DB_URL" == *"pooler.supabase.com"* || "$SUPABASE_STAGING_DB_URL" == *":6543/"* ]]; then
  echo "Warning: the staging DB URL looks like a Supabase pooler connection." >&2
  echo "Prefer the direct database connection for validation; transaction pooling can conflict with prepared SQL execution." >&2
fi

temp_sql_dir=""
cleanup_temp_sql_dir() {
  if [[ -n "$temp_sql_dir" && -d "$temp_sql_dir" ]]; then
    rm -rf "$temp_sql_dir"
  fi
}
trap cleanup_temp_sql_dir EXIT

run_sql_file_statements() {
  local source_file="$1"
  temp_sql_dir="$(mktemp -d)"

  awk -v output_dir="$temp_sql_dir" '
    BEGIN {
      RS = ";"
    }
    {
      statement = $0
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", statement)
      if (statement != "") {
        count += 1
        output_file = sprintf("%s/statement-%03d.sql", output_dir, count)
        print statement ";" > output_file
        close(output_file)
      }
    }
  ' "$source_file"

  local statement_file
  local statement_count=0
  for statement_file in "$temp_sql_dir"/statement-*.sql; do
    if [[ ! -e "$statement_file" ]]; then
      continue
    fi

    statement_count=$((statement_count + 1))
    echo "Running validation statement ${statement_count} from ${source_file}." >&2
    SUPABASE_TELEMETRY_DISABLED=1 supabase db query --db-url "$SUPABASE_STAGING_DB_URL" --file "$statement_file"
  done

  if [[ "$statement_count" -eq 0 ]]; then
    echo "No SQL statements found in ${source_file}." >&2
    exit 1
  fi
}

sql_file="supabase/tests/rls_security_checks.sql"
if [[ "$mode" == "operator-audit" ]]; then
  sql_file="docs/ops/supabase-validation.sql"
  echo "Running broader staging Supabase operator audit." >&2
  echo "Warning: audit output may include operational details. Do not commit raw output." >&2
else
  echo "Running staging Supabase RLS/security validation." >&2
fi

run_sql_file_statements "$sql_file"
