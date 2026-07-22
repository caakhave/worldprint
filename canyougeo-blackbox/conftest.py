from __future__ import annotations

import json
import os
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from dotenv import load_dotenv
from playwright.sync_api import Browser, BrowserContext, Page

from utils.cloudflare_access import cloudflare_access_headers
from utils.targets import resolve_base_url

ROOT = Path(__file__).resolve().parent
SCREENSHOT_DIR = ROOT / "reports" / "screenshots"
MARKETING_CONSENT_DENIED_INIT_SCRIPT = """
(() => {
  try {
    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "canyougeo.com" ||
      host === "www.canyougeo.com" ||
      host === "test.canyougeo.com" ||
      host.endsWith(".pages.dev")
    ) {
      window.localStorage.setItem("canyougeo:marketing-consent", "denied");
    }
  } catch (error) {}
})();
"""

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local", override=True)


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@pytest.fixture(scope="session")
def target_base_url(pytestconfig: pytest.Config) -> str:
    configured = getattr(pytestconfig.option, "base_url", None)
    try:
        return resolve_base_url(
            configured,
            {
                "CGY_BASE_URL": os.getenv("CGY_BASE_URL"),
                "CGY_TARGET": os.getenv("CGY_TARGET"),
            },
        )
    except ValueError as exc:
        raise pytest.UsageError(str(exc)) from exc


@pytest.fixture(scope="session")
def credentials() -> dict[str, dict[str, str | None] | str | None]:
    return {
        "free": {
            "email": os.getenv("CGY_FREE_EMAIL"),
            "password": os.getenv("CGY_FREE_PASSWORD"),
        },
        "pro": {
            "email": os.getenv("CGY_PRO_EMAIL"),
            "password": os.getenv("CGY_PRO_PASSWORD"),
        },
        "test_email_alias": os.getenv("CGY_TEST_EMAIL_ALIAS"),
        "run_email_live": os.getenv("CGY_RUN_EMAIL_LIVE"),
    }


def _new_context(browser: Browser, base_url: str, *, mobile: bool) -> BrowserContext:
    extra_http_headers = cloudflare_access_headers(base_url)
    if mobile:
        context = browser.new_context(
            base_url=base_url,
            extra_http_headers=extra_http_headers or None,
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=3,
            locale="en-US",
            ignore_https_errors=True,
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            ),
        )
        context.add_init_script(MARKETING_CONSENT_DENIED_INIT_SCRIPT)
        return context

    context = browser.new_context(
        base_url=base_url,
        extra_http_headers=extra_http_headers or None,
        viewport={"width": 1440, "height": 1000},
        locale="en-US",
        ignore_https_errors=True,
    )
    context.add_init_script(MARKETING_CONSENT_DENIED_INIT_SCRIPT)
    return context


@pytest.fixture
def desktop_context(browser: Browser, target_base_url: str) -> BrowserContext:
    context = _new_context(browser, target_base_url, mobile=False)
    yield context
    context.close()


@pytest.fixture
def mobile_context(browser: Browser, target_base_url: str) -> BrowserContext:
    context = _new_context(browser, target_base_url, mobile=True)
    yield context
    context.close()


def _configure_page(page: Page) -> Page:
    page.set_default_timeout(20_000)
    page.set_default_navigation_timeout(35_000)
    return page


@pytest.fixture
def desktop_page(desktop_context: BrowserContext) -> Page:
    page = _configure_page(desktop_context.new_page())
    yield page
    page.close()


@pytest.fixture
def mobile_page(mobile_context: BrowserContext) -> Page:
    page = _configure_page(mobile_context.new_page())
    yield page
    page.close()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[Any]):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)


@pytest.fixture(autouse=True)
def screenshot_on_failure(request: pytest.FixtureRequest):
    yield

    report = getattr(request.node, "rep_call", None)
    if not report or not report.failed:
        return

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    test_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", request.node.nodeid)
    timestamp = int(time.time() * 1000)

    for fixture_name in ("page", "desktop_page", "mobile_page"):
        page = request.node.funcargs.get(fixture_name)
        if page is None:
            continue
        try:
            if not page.is_closed():
                page.screenshot(path=str(SCREENSHOT_DIR / f"{test_name}-{fixture_name}-{timestamp}.png"), full_page=True)
        except Exception:
            # Do not mask the original failure with artifact-capture errors.
            pass


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    metadata_path = os.getenv("CGY_BLACKBOX_METADATA_PATH")
    if not metadata_path:
        return

    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    stats: dict[str, int] = {}
    if reporter is not None:
        for name in ("passed", "failed", "error", "skipped", "xfailed", "xpassed"):
            reports = getattr(reporter, "stats", {}).get(name, [])
            if reports:
                stats[name] = len(reports)

    payload = {
        "suite": os.getenv("CGY_BLACKBOX_SUITE") or "unknown",
        "target": os.getenv("CGY_BLACKBOX_TARGET") or os.getenv("CGY_TARGET") or "unknown",
        "base_url": os.getenv("CGY_BLACKBOX_BASE_URL") or "unknown",
        "git_sha": os.getenv("CGY_BLACKBOX_GIT_SHA") or "unknown",
        "start_utc": os.getenv("CGY_BLACKBOX_START_UTC") or "unknown",
        "end_utc": _utc_now(),
        "exitstatus": exitstatus,
        "report_path": os.getenv("CGY_BLACKBOX_REPORT_PATH") or "unknown",
        "counts": stats,
    }

    path = Path(metadata_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
