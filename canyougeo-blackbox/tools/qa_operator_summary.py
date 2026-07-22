from __future__ import annotations

import os
import sys
from pathlib import Path


SUITE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SUITE_ROOT.parent
sys.path.insert(0, str(SUITE_ROOT))

from utils.targets import DEFAULT_TARGET, TARGET_BASE_URLS, resolve_base_url


def print_section(title: str) -> None:
    print()
    print(title)
    print("-" * len(title))


def print_command(command: str) -> None:
    print(f"  {command}")


def main() -> int:
    env_target = os.environ.get("CGY_TARGET") or DEFAULT_TARGET
    env_base_url = os.environ.get("CGY_BASE_URL")

    print("Can You Geo Black-Box QA Operator Summary")
    print("==========================================")
    print(f"Suite: {SUITE_ROOT}")
    print(f"Repo:  {REPO_ROOT}")
    print(f"CGY_TARGET: {env_target}")
    if env_base_url:
        print(f"CGY_BASE_URL override: {env_base_url}")

    try:
        print(f"Resolved base URL: {resolve_base_url(env=os.environ)}")
    except ValueError as exc:
        print(f"Resolved base URL: unavailable ({exc})")

    print_section("Available Targets")
    for target, base_url in sorted(TARGET_BASE_URLS.items()):
        marker = " (default)" if target == DEFAULT_TARGET else ""
        print(f"  {target}: {base_url}{marker}")

    print_section("Root Package Shortcuts")
    print_command("pnpm qa:blackbox:operator")
    print_command("pnpm qa:blackbox:test")
    print_command("pnpm qa:blackbox:prod")
    print_command("pnpm qa:blackbox:prod-smoke")
    print_command("pnpm qa:blackbox:smoke")
    print_command("pnpm qa:blackbox:mobile")
    print_command("pnpm qa:blackbox:export")
    print_command("pnpm qa:native:android:release")
    print_command("pnpm qa:native:ios:release")

    print_section("Suite Commands")
    print_command("./.venv/bin/python tools/run_suite.py --target test --suite staging_full --report reports/test.html")
    print_command("./.venv/bin/python tools/run_suite.py --target apex --suite production_safe --report reports/prod.html")
    print_command("./.venv/bin/python tools/run_suite.py --target apex --suite prod_smoke --report reports/prod-smoke.html")
    print_command("./.venv/bin/python tools/run_suite.py --target test --suite smoke --report reports/smoke.html")
    print_command("./.venv/bin/python tools/run_suite.py --target test --suite mobile --report reports/mobile.html")
    print_command("./.venv/bin/python tools/run_suite.py --target test --suite auth --report reports/auth.html")
    print_command("./.venv/bin/python tools/run_suite.py --target apex --suite production_auth --report reports/prod-auth.html")
    print_command("./.venv/bin/python tools/run_suite.py --target www --suite production_safe --report reports/www.html")
    print_command("./.venv/bin/python tools/export_suite.py")

    print_section("Reports")
    print("  reports/test.html")
    print("  reports/prod.html")
    print("  reports/smoke.html")
    print("  reports/mobile.html")
    print("  reports/auth.html")
    print("  reports/prod-auth.html")
    print("  reports/prod-smoke.html")
    print("  reports/*.metadata.json")
    print("  reports/screenshots/")

    print_section("Operator Docs")
    print("  QA_COVERAGE_CONTRACT.md")
    print("  ../docs/qa/STAGING_LAUNCH_CHECKLIST.md")

    print_section("Safety Reminders")
    print("  Put optional auth credentials in canyougeo-blackbox/.env or .env.local and never commit them.")
    print("  If test.canyougeo.com is Cloudflare Access-protected, add CGY_CF_ACCESS_CLIENT_ID and")
    print("  CGY_CF_ACCESS_CLIENT_SECRET locally; those headers are sent only to test.canyougeo.com.")
    print("  Live challenge email is disabled by default.")
    print("  Do not set CGY_RUN_EMAIL_LIVE=1 during normal staging QA.")
    print("  Production-safe QA excludes auth, checkout, signup, email, purchase, Restore, and entitlement-changing tests.")
    print("  Optional production-auth QA requires CGY_PROD_* credentials and never falls back to staging credentials.")
    print("  Do not run live payments from the black-box suite.")
    print("  Generated reports, screenshots, caches, and export zips should remain ignored.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
