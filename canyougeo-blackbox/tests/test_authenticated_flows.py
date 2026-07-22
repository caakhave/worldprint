from __future__ import annotations

import os
import re

import pytest
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, expect

from pages.auth import AuthPage, expect_signed_in_account
from utils.assertions import normalize_url
from utils.host_policy import policy_for_base_url


PLAN_PARAMS = ["free", "pro"]


def _credential_env_prefix(plan: str, target_base_url: str) -> str:
    prefix = f"CGY_{plan.upper()}"
    if policy_for_base_url(target_base_url).kind == "production":
        return f"CGY_PROD_{plan.upper()}"
    return prefix


def _credential_pair(plan: str, target_base_url: str) -> tuple[str, str]:
    prefix = _credential_env_prefix(plan, target_base_url)
    email = os.getenv(f"{prefix}_EMAIL")
    password = os.getenv(f"{prefix}_PASSWORD")
    if not email or not password:
        pytest.skip(f"{prefix}_EMAIL and {prefix}_PASSWORD are required for this auth test.")
    return email, password


def _expect_no_live_payment_navigation(page: Page) -> None:
    expect(page).not_to_have_url(re.compile(r"checkout\.stripe\.com|billing\.stripe\.com", re.I))


def _wait_for_upgrade_account_hydration(page: Page) -> None:
    try:
        page.wait_for_function(
            """
            () => {
              const isVisible = (element) =>
                Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);

              return !Array.from(document.querySelectorAll("button:disabled")).some((button) => {
                const label = (button.textContent || "").trim();
                return isVisible(button) && /^Checking account$/i.test(label);
              });
            }
            """,
            timeout=10_000,
        )
    except PlaywrightTimeoutError as exc:
        raise AssertionError(
            "Upgrade page did not finish account hydration: disabled 'Checking account' "
            "button remained visible after 10 seconds."
        ) from exc


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
    _wait_for_upgrade_account_hydration(page)

    for game_name in ("Mystery Map", "Pattern Atlas", "Order Atlas"):
        expect(page.get_by_text(game_name).first).to_be_visible()
    expect(page.get_by_text("Open the whole atlas.").first).to_be_visible()
    expect(page.get_by_text("$3.99").first).to_be_visible()
    expect(page.get_by_text("$29.99").first).to_be_visible()
    expect(page.get_by_text(re.compile(r"Daily rounds in Daily-enabled games", re.I)).first).to_be_visible()

    secure_checkout = page.get_by_label("Secure checkout note")
    expect(secure_checkout).to_be_visible()
    expect(secure_checkout.get_by_text("Secure checkout.")).to_be_visible()

    if plan == "pro":
        expect(page.get_by_text(re.compile(r"Pro membership is enabled|already has supported Pro modes|Order Atlas Pro Play", re.I)).first).to_be_visible()
    else:
        expect(page.get_by_text("Ready for secure checkout").first).to_be_visible()
        expect(page.get_by_text(re.compile(r"Pick monthly or yearly, then continue to secure checkout", re.I)).first).to_be_visible()
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
    email, password = _credential_pair(plan, target_base_url)
    auth = AuthPage(desktop_page, target_base_url)
    auth.sign_in(email, password)

    desktop_page.goto(normalize_url(target_base_url, "/account/"), wait_until="domcontentloaded")
    _expect_account_membership(desktop_page, plan)

    desktop_page.goto(normalize_url(target_base_url, "/upgrade/"), wait_until="domcontentloaded")
    _expect_upgrade_page(desktop_page, plan)

    desktop_page.goto(normalize_url(target_base_url, "/play/order-atlas/"), wait_until="domcontentloaded")
    _expect_game_page(desktop_page, plan)

    auth.sign_out_from_account()
