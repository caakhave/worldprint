from __future__ import annotations

import os
import re

import pytest
from playwright.sync_api import expect

from utils.assertions import assert_route_status, normalize_url


@pytest.mark.smoke
@pytest.mark.production_safe
def test_mystery_map_challenge_route_handles_missing_code(desktop_page, target_base_url: str):
    assert_route_status(target_base_url, "/challenge/mystery-map/")
    desktop_page.goto(normalize_url(target_base_url, "/challenge/mystery-map/"), wait_until="domcontentloaded")
    expect(desktop_page.get_by_text(re.compile("Challenge", re.I)).first).to_be_visible()
    expect(desktop_page.get_by_text(re.compile("unavailable|link|Mystery Map", re.I)).first).to_be_visible()


@pytest.mark.production_safe
def test_legacy_worldprint_challenge_route_is_not_a_server_error(target_base_url: str):
    response = assert_route_status(target_base_url, "/challenge/worldprint/")
    assert response.status_code < 500


@pytest.mark.production_safe
def test_mystery_map_challenge_missing_code_is_spoiler_safe(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/challenge/mystery-map/"), wait_until="domcontentloaded")
    body = desktop_page.locator("body").inner_text()

    assert re.search(r"Challenge", body, flags=re.I)
    assert not re.search(r"correct answer|hidden indicator|source label|answerCountries|correctIndicatorId", body, flags=re.I)


@pytest.mark.email_live
def test_live_challenge_email_is_explicitly_opt_in(credentials):
    if os.getenv("CGY_RUN_EMAIL_LIVE") != "1":
        pytest.skip("Live challenge email is disabled by default. Set CGY_RUN_EMAIL_LIVE=1 to opt in.")
    if not credentials.get("test_email_alias"):
        pytest.skip("CGY_TEST_EMAIL_ALIAS is required for live email checks.")

    pytest.skip("Implement the live email-send flow only when private QA wants real email delivery checks.")
