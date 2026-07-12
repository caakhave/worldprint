from __future__ import annotations

import os
import re
from datetime import UTC, datetime

import pytest
from playwright.sync_api import Page, expect

from pages.auth import expect_sign_up_form
from utils.analytics import capture_data_layer_event_names, event_count, wait_for_event_name
from utils.assertions import normalize_url

pytestmark = [
    pytest.mark.auth,
    pytest.mark.signup_analytics,
    pytest.mark.skipif(
        os.getenv("CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE") != "1",
        reason="Set CGY_ENABLE_SIGNUP_ANALYTICS_SMOKE=1 to run the signup analytics smoke.",
    ),
    pytest.mark.skipif(
        not (os.getenv("CGY_SIGNUP_ANALYTICS_PASSWORD") and (os.getenv("CGY_SIGNUP_ANALYTICS_EMAIL") or os.getenv("CGY_SIGNUP_ANALYTICS_EMAIL_BASE"))),
        reason=(
            "CGY_SIGNUP_ANALYTICS_PASSWORD and either CGY_SIGNUP_ANALYTICS_EMAIL "
            "or CGY_SIGNUP_ANALYTICS_EMAIL_BASE are required."
        ),
    ),
]


def _signup_password() -> str:
    password = os.getenv("CGY_SIGNUP_ANALYTICS_PASSWORD")
    if not password:
        pytest.skip("CGY_SIGNUP_ANALYTICS_PASSWORD is required for signup analytics smoke.")
    return password


def _signup_email() -> str:
    explicit_email = os.getenv("CGY_SIGNUP_ANALYTICS_EMAIL")
    if explicit_email:
        return explicit_email

    base_email = os.getenv("CGY_SIGNUP_ANALYTICS_EMAIL_BASE")
    if not base_email:
        pytest.skip("CGY_SIGNUP_ANALYTICS_EMAIL or CGY_SIGNUP_ANALYTICS_EMAIL_BASE is required.")
    if "@" not in base_email:
        pytest.fail("CGY_SIGNUP_ANALYTICS_EMAIL_BASE must be an email address that supports plus-address aliases.")

    local, domain = base_email.rsplit("@", 1)
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    return f"{local}+cgyqa{timestamp}@{domain}"


def test_signup_emits_signup_complete_without_legacy_duplicate(desktop_page: Page, target_base_url: str):
    email = _signup_email()
    password = _signup_password()

    desktop_page.goto(normalize_url(target_base_url, "/sign-up/"), wait_until="domcontentloaded")
    expect_sign_up_form(desktop_page)
    analytics_events = capture_data_layer_event_names(desktop_page)

    desktop_page.get_by_label("Email").fill(email)
    desktop_page.get_by_label("Password", exact=True).fill(password)
    desktop_page.get_by_label("Confirm password").fill(password)
    desktop_page.get_by_role("button", name=re.compile("^Create account$", re.I)).click()

    wait_for_event_name(desktop_page, analytics_events, "cgy_signup_complete", timeout_ms=20_000)
    desktop_page.wait_for_timeout(1_000)

    assert event_count(analytics_events, "cgy_signup_complete") == 1
    assert "cgy_sign_up" not in analytics_events
    expect(desktop_page.get_by_text(re.compile(r"We sent a confirmation link|Account created|Your atlas is connected", re.I)).first).to_be_visible(
        timeout=20_000
    )
