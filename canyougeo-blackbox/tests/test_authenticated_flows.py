from __future__ import annotations

import pytest
from playwright.sync_api import expect

from pages.auth import AuthPage
from utils.assertions import normalize_url


def _credential_pair(credentials, plan: str) -> tuple[str, str]:
    plan_credentials = credentials[plan]
    email = plan_credentials.get("email") if isinstance(plan_credentials, dict) else None
    password = plan_credentials.get("password") if isinstance(plan_credentials, dict) else None
    if not email or not password:
        pytest.skip(f"CGY_{plan.upper()}_EMAIL and CGY_{plan.upper()}_PASSWORD are required for this auth test.")
    return email, password


@pytest.mark.auth
@pytest.mark.parametrize("plan", ["free", "pro"])
def test_authenticated_account_and_game_smoke(desktop_page, target_base_url: str, credentials, plan: str):
    email, password = _credential_pair(credentials, plan)
    auth = AuthPage(desktop_page, target_base_url)
    auth.sign_in(email, password)

    desktop_page.goto(normalize_url(target_base_url, "/account/"), wait_until="domcontentloaded")
    expect(desktop_page.get_by_text("Account").first).to_be_visible()

    desktop_page.goto(normalize_url(target_base_url, "/upgrade/"), wait_until="domcontentloaded")
    expect(desktop_page.get_by_text("Mystery Map").first).to_be_visible()

    desktop_page.goto(normalize_url(target_base_url, "/play/order-atlas/"), wait_until="domcontentloaded")
    expect(desktop_page.get_by_text("Order Atlas").first).to_be_visible()
