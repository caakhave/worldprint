from __future__ import annotations

import os
import re
import time
from collections.abc import Sequence

import pytest
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, expect

from pages.auth import AuthPage
from utils.analytics import capture_data_layer_event_names, wait_for_event_name
from utils.assertions import normalize_url

CHECKOUT_URL_RE = re.compile(r"^https://checkout\.stripe\.com/", re.I)
CHECKOUT_FAILURE_RE = re.compile(r"We could not open checkout", re.I)
STRIPE_OPEN_TIMEOUT_SECONDS = 45

pytestmark = [
    pytest.mark.auth,
    pytest.mark.checkout_smoke,
    pytest.mark.skipif(
        os.getenv("CGY_ENABLE_CHECKOUT_SMOKE") != "1",
        reason="Set CGY_ENABLE_CHECKOUT_SMOKE=1 to run the live checkout-open smoke.",
    ),
    pytest.mark.skipif(
        not (os.getenv("CGY_CHECKOUT_EMAIL") and os.getenv("CGY_CHECKOUT_PASSWORD")),
        reason="CGY_CHECKOUT_EMAIL and CGY_CHECKOUT_PASSWORD are required for checkout smoke.",
    ),
]


def _checkout_credentials() -> tuple[str, str]:
    email = os.getenv("CGY_CHECKOUT_EMAIL")
    password = os.getenv("CGY_CHECKOUT_PASSWORD")
    if not email or not password:
        pytest.skip("CGY_CHECKOUT_EMAIL and CGY_CHECKOUT_PASSWORD are required for checkout smoke.")
    return email, password


def _checkout_plan() -> str:
    plan = (os.getenv("CGY_CHECKOUT_PLAN") or "monthly").strip().lower()
    if plan not in {"monthly", "yearly"}:
        pytest.fail("CGY_CHECKOUT_PLAN must be either 'monthly' or 'yearly'.")
    return plan


def _checkout_page_or_popup(page: Page, popup_pages: Sequence[Page]) -> Page | None:
    for candidate in (page, *popup_pages):
        try:
            if CHECKOUT_URL_RE.search(candidate.url):
                return candidate
            candidate.wait_for_url(CHECKOUT_URL_RE, timeout=500)
            return candidate
        except PlaywrightTimeoutError:
            continue
    return None


def _visible_page_text(page: Page) -> str:
    try:
        return page.locator("body").inner_text(timeout=1_000)
    except Exception:
        return ""


def _wait_for_stripe_checkout(page: Page, popup_pages: Sequence[Page], analytics_events: list[str]) -> Page:
    deadline = time.monotonic() + STRIPE_OPEN_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        checkout_page = _checkout_page_or_popup(page, popup_pages)
        if checkout_page:
            return checkout_page
        page.wait_for_timeout(500)

    body_text = _visible_page_text(page)
    if CHECKOUT_FAILURE_RE.search(body_text):
        assert "cgy_begin_checkout" not in analytics_events
    assert not CHECKOUT_FAILURE_RE.search(body_text), "App showed the checkout failure message instead of opening Stripe Checkout."
    raise AssertionError(
        f"Stripe Checkout did not open within {STRIPE_OPEN_TIMEOUT_SECONDS}s. "
        f"Current app URL: {page.url}. Visible page excerpt: {body_text[:500]}"
    )


@pytest.mark.parametrize("path", ["/upgrade/"])
def test_signed_in_free_checkout_opens_stripe_and_emits_conversion_events(desktop_page: Page, target_base_url: str, path: str):
    email, password = _checkout_credentials()
    plan = _checkout_plan()
    auth = AuthPage(desktop_page, target_base_url)

    auth.sign_in(email, password)
    desktop_page.goto(normalize_url(target_base_url, path), wait_until="domcontentloaded")

    analytics_events = capture_data_layer_event_names(desktop_page)
    expect(desktop_page.get_by_text(CHECKOUT_FAILURE_RE).first).not_to_be_visible()

    checkout_button = desktop_page.get_by_role("button", name=re.compile(f"^Join {plan}$", re.I)).first
    expect(checkout_button).to_be_visible(timeout=20_000)
    expect(checkout_button).to_be_enabled()

    popup_pages: list[Page] = []
    desktop_page.on("popup", popup_pages.append)
    checkout_button.click()
    wait_for_event_name(desktop_page, analytics_events, "cgy_upgrade_click", timeout_ms=5_000)

    checkout_page = _wait_for_stripe_checkout(desktop_page, popup_pages, analytics_events)

    assert CHECKOUT_URL_RE.search(checkout_page.url), f"Expected Stripe Checkout URL, got {checkout_page.url}"
    assert not CHECKOUT_FAILURE_RE.search(_visible_page_text(desktop_page))
    assert "cgy_begin_checkout" in analytics_events
