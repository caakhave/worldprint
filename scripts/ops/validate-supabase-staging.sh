#!/usr/bin/env bash
set -euo pipefail
set +x

usage() {
  cat <<'USAGE'
Usage:
  scripts/ops/validate-supabase-staging.sh [--prompt|--prompt-parts] [--operator-audit|--full]

Runs read-only Supabase validation SQL against the staging database.

Required environment:
  SUPABASE_STAGING_DB_URL must be exported by the operator before running,
  unless --prompt is used.

Safety:
  - This script never prints the database URL.
  - This script does not load .env files.
  - This script does not use linked Supabase project state.
  - Prefer the direct Supabase database connection string.
  - Transaction pooler URLs may fail because validation uses prepared query execution.
  - Prompt mode reads the DB URL with echo disabled where possible and unsets it on exit.
  - Prompt-parts mode asks for project ref/host plus password separately, URL-encodes
    the password, and unsets the constructed URL on exit.
  - Do not commit raw SQL output from the broader operator audit.
USAGE
}

mode="rls"
prompt_for_db_url=false
prompt_for_db_parts=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    "--rls")
      mode="rls"
      ;;
    "--operator-audit" | "--full")
      mode="operator-audit"
      ;;
    "--prompt")
      prompt_for_db_url=true
      ;;
    "--prompt-parts")
      prompt_for_db_parts=true
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
  shift
done

if [[ "$prompt_for_db_url" == true && "$prompt_for_db_parts" == true ]]; then
  echo "Use either --prompt or --prompt-parts, not both." >&2
  exit 64
fi

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

prompt_loaded_db_url=false
temp_sql_dir=""
cleanup_runner() {
  if [[ -n "$temp_sql_dir" && -d "$temp_sql_dir" ]]; then
    rm -rf "$temp_sql_dir"
  fi
  unset db_url_input db_password_input encoded_password project_or_host_input db_host
  if [[ "$prompt_loaded_db_url" == true ]]; then
    unset SUPABASE_STAGING_DB_URL
  fi
}
trap cleanup_runner EXIT

read_hidden_line() {
  local prompt="$1"
  local __result_var="$2"
  local input=""
  local stty_state=""

  printf "%s" "$prompt" >&2
  if [[ -t 0 ]]; then
    stty_state="$(stty -g 2>/dev/null || true)"
    if [[ -n "$stty_state" ]]; then
      stty -echo
    fi
  fi
  IFS= read -r input || input=""
  if [[ -n "$stty_state" ]]; then
    stty "$stty_state"
    printf "\n" >&2
  fi

  printf -v "$__result_var" "%s" "$input"
}

url_encode_stdin() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required for --prompt-parts password encoding, but it was not found on PATH." >&2
    exit 127
  fi

  node -e 'let input = ""; process.stdin.setEncoding("utf8"); process.stdin.on("data", (chunk) => { input += chunk; }); process.stdin.on("end", () => { process.stdout.write(encodeURIComponent(input)); });'
}

if [[ "$prompt_for_db_url" == true ]]; then
  printf "Paste staging Supabase direct DB URL (input hidden): " >&2
  db_url_input=""
  stty_state=""
  if [[ -t 0 ]]; then
    stty_state="$(stty -g 2>/dev/null || true)"
    if [[ -n "$stty_state" ]]; then
      stty -echo
    fi
  fi
  IFS= read -r db_url_input || db_url_input=""
  if [[ -n "$stty_state" ]]; then
    stty "$stty_state"
    printf "\n" >&2
  fi

  if [[ ! "$db_url_input" =~ ^postgres(ql)?:// ]]; then
    echo "Invalid staging DB URL. Expected a postgres:// or postgresql:// connection string." >&2
    unset db_url_input
    exit 1
  fi

  export SUPABASE_STAGING_DB_URL="$db_url_input"
  unset db_url_input
  prompt_loaded_db_url=true
elif [[ "$prompt_for_db_parts" == true ]]; then
  printf "Staging Supabase project ref or direct host: " >&2
  project_or_host_input=""
  IFS= read -r project_or_host_input || project_or_host_input=""
  project_or_host_input="${project_or_host_input#"${project_or_host_input%%[![:space:]]*}"}"
  project_or_host_input="${project_or_host_input%"${project_or_host_input##*[![:space:]]}"}"

  if [[ -z "$project_or_host_input" ]]; then
    echo "Missing staging project ref or direct host." >&2
    unset project_or_host_input
    exit 1
  fi

  if [[ "$project_or_host_input" == *"://"* || "$project_or_host_input" == *"/"* || "$project_or_host_input" == *"@"* || "$project_or_host_input" == *":"* ]]; then
    echo "Invalid staging project ref or host. Enter a bare project ref or direct host, not a URL." >&2
    unset project_or_host_input
    exit 1
  fi

  if [[ "$project_or_host_input" == "jquebthneczqdxagagof" || "$project_or_host_input" == *"jquebthneczqdxagagof"* ]]; then
    echo "Refusing to construct a database URL for the production Supabase project ref." >&2
    unset project_or_host_input
    exit 1
  fi

  db_host="$project_or_host_input"
  if [[ "$db_host" != *"."* ]]; then
    db_host="db.${db_host}.supabase.co"
  fi
  if [[ "$db_host" != db.*.supabase.co ]]; then
    echo "Invalid staging host. Expected a direct Supabase DB host like db.<project-ref>.supabase.co." >&2
    unset project_or_host_input db_host
    exit 1
  fi

  db_password_input=""
  read_hidden_line "Staging database password (input hidden): " db_password_input
  if [[ -z "$db_password_input" ]]; then
    echo "Missing staging database password." >&2
    unset project_or_host_input db_host db_password_input
    exit 1
  fi

  encoded_password="$(printf "%s" "$db_password_input" | url_encode_stdin)"
  unset db_password_input

  export SUPABASE_STAGING_DB_URL="postgresql://postgres:${encoded_password}@${db_host}:5432/postgres"
  unset encoded_password project_or_host_input db_host
  prompt_loaded_db_url=true
elif [[ -z "${SUPABASE_STAGING_DB_URL:-}" ]]; then
  echo "Missing SUPABASE_STAGING_DB_URL." >&2
  echo "Export SUPABASE_STAGING_DB_URL explicitly without printing it, or rerun with --prompt-parts." >&2
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
