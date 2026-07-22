from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect

from utils.assertions import assert_route_status, normalize_url

PUBLIC_SECRET_MARKERS = (
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    "GOOGLE_PLAY_SERVICE_ACCOUNT",
    "APP_STORE_SERVER_PRIVATE_KEY",
    "purchaseToken",
    "signedPayload",
    "appAccountToken",
    "sk_live_",
    "sk_test_",
    "whsec_",
)


def _visible_text(html: str) -> str:
    without_comments = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    without_tags = re.sub(r"<[^>]+>", " ", without_comments)
    return re.sub(r"\s+", " ", without_tags)


@pytest.mark.production_safe
def test_legal_copy_covers_provider_neutral_mobile_billing(target_base_url: str):
    text = _visible_text(assert_route_status(target_base_url, "/legal/").text)

    assert re.search(r"Pro may be purchased through the Can You Geo website, the Apple App Store, or Google Play", text, re.I)
    assert re.search(r"Website billing may be handled through Stripe", text, re.I)
    assert re.search(r"Native mobile subscriptions are processed by the applicable app store", text, re.I)
    assert re.search(r"Renewal, cancellation, refunds, taxes, payment failures, and billing disputes", text, re.I)
    assert re.search(r"does not receive or store complete payment-card details", text, re.I)
    assert re.search(r"billing provider, product or base-plan identifier", text, re.I)
    assert re.search(r"transaction, purchase, or subscription identifier, purchase token", text, re.I)
    assert re.search(r"account deletion page", text, re.I)


@pytest.mark.production_safe
def test_support_and_account_deletion_copy_are_consistent(target_base_url: str):
    support = _visible_text(assert_route_status(target_base_url, "/support/").text)
    deletion = _visible_text(assert_route_status(target_base_url, "/account-deletion/").text)

    assert "support@canyougeo.com" in support
    assert "support@canyougeo.com" in deletion
    assert re.search(r"Apple App Store and Google Play subscriptions should be managed", support, re.I)
    assert re.search(r"never send passwords, complete payment-card details, purchase tokens, or private store receipts", support, re.I)
    assert re.search(r"Subscriptions Are Separate|Deleting a Can You Geo account does not necessarily cancel", deletion, re.I)
    assert re.search(r"Apple App Store|Google Play|Stripe", deletion, re.I)
    assert re.search(r"verify your identity|identity", deletion, re.I)
    assert re.search(r"retention|legal|fraud|security", deletion, re.I)


@pytest.mark.production_safe
def test_web_upgrade_page_does_not_show_native_purchase_controls(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/upgrade/"), wait_until="domcontentloaded")

    expect(desktop_page.get_by_text("Open the whole atlas.").first).to_be_visible()
    expect(desktop_page.get_by_text("Apple purchases").first).not_to_be_visible()
    expect(desktop_page.get_by_text("Google Play purchases").first).not_to_be_visible()
    expect(desktop_page.get_by_role("button", name=re.compile("Restore Purchases", re.I))).not_to_be_visible()
    expect(desktop_page).not_to_have_url(re.compile(r"checkout\.stripe\.com|billing\.stripe\.com", re.I))


@pytest.mark.production_safe
def test_signed_out_account_routes_do_not_expose_private_state(desktop_page, target_base_url: str):
    for path in ("/account/", "/account/stats/"):
        desktop_page.goto(normalize_url(target_base_url, path), wait_until="domcontentloaded")
        body = desktop_page.locator("body").inner_text()

        assert re.search(r"Sign in|Create account|Account sign-in", body, flags=re.I)
        assert not re.search(r"Support ID copied|Stripe customer|Stripe subscription|provider subscription|purchase token", body, re.I)
        expect(desktop_page).not_to_have_url(re.compile(r"checkout\.stripe\.com|billing\.stripe\.com", re.I))


@pytest.mark.production_safe
def test_public_html_omits_private_billing_and_secret_markers(target_base_url: str):
    for path in ("/", "/upgrade/", "/legal/", "/privacy/", "/terms/", "/support/", "/account-deletion/"):
        html = assert_route_status(target_base_url, path).text
        for marker in PUBLIC_SECRET_MARKERS:
            assert marker not in html, f"{path} exposed private marker {marker}"
