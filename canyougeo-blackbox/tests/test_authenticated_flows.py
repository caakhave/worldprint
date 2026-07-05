from __future__ import annotations

import os
import re

import pytest
from playwright.sync_api import Page, expect

from pages.auth import AuthPage, expect_signed_in_account
from utils.assertions import normalize_url


def _has_plan_credentials(plan: str) -> bool:
    prefix = f"CGY_{plan.upper()}"
    return bool(os.getenv(f"{prefix}_EMAIL") and os.getenv(f"{prefix}_PASSWORD"))


PLAN_PARAMS = [
    pytest.param(
        "free",
        marks=pytest.mark.skipif(
            not _has_plan_credentials("free"),
            reason="CGY_FREE_EMAIL and CGY_FREE_PASSWORD are required for this auth test.",
        ),
    ),
    pytest.param(
        "pro",
        marks=pytest.mark.skipif(
            not _has_plan_credentials("pro"),
            reason="CGY_PRO_EMAIL and CGY_PRO_PASSWORD are required for this auth test.",
        ),
    ),
]


def _credential_pair(plan: str) -> tuple[str, str]:
    prefix = f"CGY_{plan.upper()}"
    email = os.getenv(f"{prefix}_EMAIL")
    password = os.getenv(f"{prefix}_PASSWORD")
    if not email or not password:
        pytest.skip(f"{prefix}_EMAIL and {prefix}_PASSWORD are required for this auth test.")
    return email, password


def _expect_no_live_payment_navigation(page: Page) -> None:
    expect(page).not_to_have_url(re.compile(r"checkout\.stripe\.com|billing\.stripe\.com", re.I))


def _expect_account_membership(page: Page, plan: str) -> None:
    expect_signed_in_account(page)
    expect(page.get_by_text("Player profile")).to_be_visible()
    membership = page.get_by_label("Membership plan")
    expect(membership).to_be_visible()
    expect(membership.get_by_text("Membership", exact=True)).to_be_visible()
    if plan == "pro":
        expect(membership.get_by_text(re.compile(r"Can You Geo\? Pro|Pro membership is active", re.I)).first).to_be_visible()
    else:
        expect(membership.get_by_text(re.compile(r"Free account|Daily games and basic stats", re.I)).first).to_be_visible()


def _expect_upgrade_page(page: Page, plan: str) -> None:
    for game_name in ("Mystery Map", "Pattern Atlas", "Order Atlas"):
        expect(page.get_by_text(game_name).first).to_be_visible()
    if plan == "pro":
        expect(page.get_by_text(re.compile(r"Pro membership is enabled|already has supported Pro modes|Order Atlas Pro Play", re.I)).first).to_be_visible()
    else:
        expect(page.get_by_text(re.compile(r"Choose Free or Pro|Checkout is coming soon|Continue free", re.I)).first).to_be_visible()
    _expect_no_live_payment_navigation(page)


def _expect_game_page(page: Page, plan: str) -> None:
    expect(page.get_by_role("heading", name=re.compile("Order Atlas", re.I)).first).to_be_visible()
    if plan == "pro":
        expect(page.get_by_text(re.compile(r"Unlimited Order Atlas Play|Start Order Atlas Play|Pro Play", re.I)).first).to_be_visible()
    else:
        expect(page.get_by_text(re.compile(r"Order Atlas Daily|Start Order Atlas Daily|Free Daily", re.I)).first).to_be_visible()
    _expect_no_live_payment_navigation(page)


@pytest.mark.auth
@pytest.mark.parametrize("plan", PLAN_PARAMS)
def test_authenticated_account_and_game_smoke(desktop_page, target_base_url: str, plan: str):
    email, password = _credential_pair(plan)
    auth = AuthPage(desktop_page, target_base_url)
    auth.sign_in(email, password)

    desktop_page.goto(normalize_url(target_base_url, "/account/"), wait_until="domcontentloaded")
    _expect_account_membership(desktop_page, plan)

    desktop_page.goto(normalize_url(target_base_url, "/upgrade/"), wait_until="domcontentloaded")
    _expect_upgrade_page(desktop_page, plan)

    desktop_page.goto(normalize_url(target_base_url, "/play/order-atlas/"), wait_until="domcontentloaded")
    _expect_game_page(desktop_page, plan)

    auth.sign_out_from_account()
