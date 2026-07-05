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
    print_command("pnpm qa:blackbox:smoke")
    print_command("pnpm qa:blackbox:mobile")
    print_command("pnpm qa:blackbox:export")

    print_section("Suite Commands")
    print_command("CGY_TARGET=test pytest --html=reports/test.html --self-contained-html")
    print_command("CGY_TARGET=test pytest -m smoke --html=reports/smoke.html --self-contained-html")
    print_command("CGY_TARGET=test pytest -m mobile --html=reports/mobile.html --self-contained-html")
    print_command("CGY_TARGET=test pytest -m auth --html=reports/auth.html --self-contained-html")
    print_command("python tools/export_suite.py")

    print_section("Reports")
    print("  reports/test.html")
    print("  reports/smoke.html")
    print("  reports/mobile.html")
    print("  reports/auth.html")
    print("  reports/screenshots/")

    print_section("Operator Docs")
    print("  QA_COVERAGE_CONTRACT.md")
    print("  ../docs/qa/STAGING_LAUNCH_CHECKLIST.md")

    print_section("Safety Reminders")
    print("  Put optional auth credentials in canyougeo-blackbox/.env and never commit them.")
    print("  Live challenge email is disabled by default.")
    print("  Do not set CGY_RUN_EMAIL_LIVE=1 during normal staging QA.")
    print("  Do not run live payments from the black-box suite.")
    print("  Generated reports, screenshots, caches, and export zips should remain ignored.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
