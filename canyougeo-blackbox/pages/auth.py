from __future__ import annotations

import re

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, expect

from pages.base import BasePage


SIGNED_IN_ACCOUNT_URL_RE = re.compile(r"/account/?(?:[?#].*)?$")
SIGNED_IN_HELP = (
    "Sign-in did not reach a confirmed signed-in account state. Likely causes: "
    "invalid staging credentials, the account is not present in the test Supabase project, "
    "password auth is not enabled for that account, or the sign-in form behavior changed."
)


class AuthPage(BasePage):
    def sign_in(self, email: str, password: str) -> None:
        self.goto("/sign-in/")
        expect_sign_in_form(self.page)
        self.page.get_by_label("Email").fill(email)
        self.page.get_by_label("Password").fill(password)
        self.page.get_by_role("button", name=re.compile("^Sign in$", re.I)).click()
        try:
            expect(self.page).to_have_url(SIGNED_IN_ACCOUNT_URL_RE, timeout=35_000)
            expect_signed_in_account(self.page)
        except (AssertionError, PlaywrightTimeoutError) as exc:
            raise AssertionError(self._sign_in_failure_context()) from exc

    def sign_out_from_account(self) -> None:
        self.goto("/account/")
        expect_signed_in_account(self.page)
        sign_out = self.page.get_by_role("button", name=re.compile("^Sign out$", re.I))
        expect(sign_out).to_be_visible(timeout=20_000)
        sign_out.click()
        expect(self.page.get_by_text(re.compile("signed out|sign in", re.I)).first).to_be_visible(timeout=20_000)
        expect_sign_in_form(self.page)

    def _sign_in_failure_context(self) -> str:
        alert_text = _safe_first_text(self.page.get_by_role("alert"))
        status_text = _safe_first_text(self.page.get_by_role("status"))
        body_text = _safe_first_text(self.page.locator("body"), limit=700)
        details = [
            SIGNED_IN_HELP,
            f"Current URL: {self.page.url}",
        ]
        if alert_text:
            details.append(f"Visible alert: {alert_text}")
        if status_text:
            details.append(f"Visible status: {status_text}")
        if body_text:
            details.append(f"Visible page text excerpt: {body_text}")
        return "\n".join(details)


def _safe_first_text(locator, limit: int = 300) -> str:
    try:
        text = locator.first.inner_text(timeout=1_000)
    except Exception:
        return ""
    return re.sub(r"\s+", " ", text).strip()[:limit]


def expect_sign_in_form(page: Page) -> None:
    expect(page.get_by_role("heading", name=re.compile("Sign in with email and password", re.I))).to_be_visible()
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password")).to_be_visible()


def expect_signed_in_account(page: Page) -> None:
    expect(page).to_have_url(SIGNED_IN_ACCOUNT_URL_RE, timeout=20_000)
    expect(page.get_by_role("heading", name=re.compile("Your atlas is connected", re.I))).to_be_visible(timeout=20_000)
    expect(page.get_by_role("button", name=re.compile("^Sign out$", re.I))).to_be_visible(timeout=10_000)
    expect(page.get_by_label("Membership plan")).to_be_visible(timeout=10_000)


def expect_sign_up_form(page: Page) -> None:
    expect(page.get_by_role("heading", name=re.compile("Create your Can You Geo", re.I))).to_be_visible()
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password", exact=True)).to_be_visible()
    expect(page.get_by_label("Confirm password")).to_be_visible()
