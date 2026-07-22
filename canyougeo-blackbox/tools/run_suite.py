from __future__ import annotations

import argparse
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

SUITE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SUITE_ROOT.parent
PYTHON = SUITE_ROOT / ".venv" / "bin" / "python"

APPROVED_TARGETS = ("test", "apex", "www", "local")
LIVE_OR_MUTATING_MARKERS = ("checkout_smoke", "signup_analytics", "email_live")
AUTH_MARKERS = ("auth", "production_auth")
STAGING_ONLY_MARKER = "staging_only"


@dataclass(frozen=True)
class SuiteDefinition:
    name: str
    marker_expression: str
    description: str


def _exclude_expression(markers: tuple[str, ...]) -> str:
    return "not (" + " or ".join(markers) + ")"


NORMAL_STAGING_EXCLUSIONS = LIVE_OR_MUTATING_MARKERS + ("production_auth",)
PRODUCTION_SAFE_EXCLUSIONS = LIVE_OR_MUTATING_MARKERS + AUTH_MARKERS + (STAGING_ONLY_MARKER,)

SUITES: dict[str, SuiteDefinition] = {
    "staging_full": SuiteDefinition(
        "staging_full",
        _exclude_expression(NORMAL_STAGING_EXCLUSIONS),
        "Complete staging browser suite; live email, signup, checkout, and production-auth checks are excluded.",
    ),
    "production_safe": SuiteDefinition(
        "production_safe",
        "production_safe and " + _exclude_expression(PRODUCTION_SAFE_EXCLUSIONS),
        "Complete production-safe public browser suite with no auth, email, signup, checkout, or staging-only checks.",
    ),
    "prod_smoke": SuiteDefinition(
        "prod_smoke",
        "prod_smoke and " + _exclude_expression(PRODUCTION_SAFE_EXCLUSIONS),
        "Minimal production launch smoke.",
    ),
    "smoke": SuiteDefinition(
        "smoke",
        "smoke and " + _exclude_expression(LIVE_OR_MUTATING_MARKERS + ("production_auth",)),
        "Fast public smoke.",
    ),
    "mobile": SuiteDefinition(
        "mobile",
        "mobile and " + _exclude_expression(LIVE_OR_MUTATING_MARKERS + AUTH_MARKERS),
        "Mobile viewport/browser checks.",
    ),
    "auth": SuiteDefinition(
        "auth",
        "auth and not production_auth and " + _exclude_expression(LIVE_OR_MUTATING_MARKERS),
        "Optional authenticated staging checks using CGY_FREE_* and CGY_PRO_* credentials.",
    ),
    "production_auth": SuiteDefinition(
        "production_auth",
        "auth and " + _exclude_expression(LIVE_OR_MUTATING_MARKERS),
        "Optional authenticated production checks using CGY_PROD_* credentials only.",
    ),
}


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def git_sha() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception:
        return "unknown"
    return result.stdout.strip() or "unknown"


def approved_report_path(report: str) -> Path:
    path = Path(report)
    if path.is_absolute():
        raise ValueError("--report must be a relative path under reports/")
    if path.suffix != ".html":
        raise ValueError("--report must end with .html")
    normalized = (SUITE_ROOT / path).resolve()
    reports_root = (SUITE_ROOT / "reports").resolve()
    if reports_root not in normalized.parents:
        raise ValueError("--report must be under canyougeo-blackbox/reports/")
    return normalized


def validate_suite_target(suite: str, target: str) -> None:
    if target not in APPROVED_TARGETS:
        raise ValueError(f"Unknown target '{target}'. Expected one of: {', '.join(APPROVED_TARGETS)}.")
    if suite not in SUITES:
        raise ValueError(f"Unknown suite '{suite}'. Expected one of: {', '.join(sorted(SUITES))}.")
    if suite == "auth" and target in {"apex", "www"}:
        raise ValueError("Use suite 'production_auth' for authenticated production checks.")
    if suite == "production_auth" and target not in {"apex", "www"}:
        raise ValueError("production_auth can only target apex or www production hosts.")


def metadata_path_for(report_path: Path) -> Path:
    return report_path.with_suffix(".metadata.json")


def build_pytest_command(*, suite: str, report_path: Path, headed: bool = False) -> list[str]:
    definition = SUITES[suite]
    python = PYTHON if PYTHON.exists() else Path(sys.executable)
    command = [
        str(python),
        "-m",
        "pytest",
        "-m",
        definition.marker_expression,
        f"--html={report_path.relative_to(SUITE_ROOT)}",
        "--self-contained-html",
    ]
    if headed:
        command.append("--headed")
    return command


def _sensitive_values(env: dict[str, str]) -> list[str]:
    sensitive_parts = ("PASSWORD", "SECRET", "TOKEN", "AUTH", "COOKIE", "KEY", "CLIENT_ID")
    values = []
    for name, value in env.items():
        if not value or len(value) < 4:
            continue
        if any(part in name.upper() for part in sensitive_parts):
            values.append(value)
    return sorted(set(values), key=len, reverse=True)


def sanitize_output(text: str, env: dict[str, str]) -> str:
    sanitized = text
    for value in _sensitive_values(env):
        sanitized = sanitized.replace(value, "[redacted]")
    return sanitized


def run_suite(*, target: str, suite: str, report: str, headed: bool = False) -> int:
    validate_suite_target(suite, target)
    report_path = approved_report_path(report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path = metadata_path_for(report_path)
    start_utc = utc_now()
    base_url = {
        "test": "https://test.canyougeo.com",
        "apex": "https://canyougeo.com",
        "www": "https://www.canyougeo.com",
        "local": "http://localhost:3000",
    }[target]

    env = os.environ.copy()
    env["CGY_TARGET"] = target
    env.pop("CGY_BASE_URL", None)
    env["CGY_BLACKBOX_SUITE"] = suite
    env["CGY_BLACKBOX_TARGET"] = target
    env["CGY_BLACKBOX_BASE_URL"] = base_url
    env["CGY_BLACKBOX_REPORT_PATH"] = str(report_path)
    env["CGY_BLACKBOX_METADATA_PATH"] = str(metadata_path)
    env["CGY_BLACKBOX_START_UTC"] = start_utc
    env["CGY_BLACKBOX_GIT_SHA"] = git_sha()

    command = build_pytest_command(suite=suite, report_path=report_path, headed=headed)
    print(f"Can You Geo black-box suite: {suite}")
    print(f"Target: {target} ({base_url})")
    print(f"Report: {report_path}")
    print(f"Metadata: {metadata_path}")

    result = subprocess.run(command, cwd=SUITE_ROOT, env=env, capture_output=True, text=True)
    if result.stdout:
        sys.stdout.write(sanitize_output(result.stdout, env))
    if result.stderr:
        sys.stderr.write(sanitize_output(result.stderr, env))

    print(f"Completed suite '{suite}' for target '{target}' with exit code {result.returncode}.")
    print(f"HTML report: {report_path}")
    if metadata_path.exists():
        print(f"Run metadata: {metadata_path}")
    return result.returncode


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a safe Can You Geo browser black-box QA suite.")
    parser.add_argument("--target", required=True, choices=APPROVED_TARGETS)
    parser.add_argument("--suite", required=True, choices=sorted(SUITES))
    parser.add_argument("--report", required=True)
    parser.add_argument("--headed", action="store_true", help="Run Playwright headed. Never enabled by default.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        return run_suite(target=args.target, suite=args.suite, report=args.report, headed=args.headed)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
