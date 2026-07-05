from __future__ import annotations

import os
import re
import time
from pathlib import Path
from typing import Any

import pytest
from dotenv import load_dotenv
from playwright.sync_api import Browser, BrowserContext, Page

from utils.targets import resolve_base_url

ROOT = Path(__file__).resolve().parent
SCREENSHOT_DIR = ROOT / "reports" / "screenshots"

load_dotenv(ROOT / ".env")


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
    if mobile:
        return browser.new_context(
            base_url=base_url,
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

    return browser.new_context(
        base_url=base_url,
        viewport={"width": 1440, "height": 1000},
        locale="en-US",
        ignore_https_errors=True,
    )


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
