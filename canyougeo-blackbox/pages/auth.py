from __future__ import annotations

import re

from playwright.sync_api import Page, expect

from pages.base import BasePage


class AuthPage(BasePage):
    def sign_in(self, email: str, password: str) -> None:
        self.goto("/sign-in/")
        self.page.get_by_label("Email").fill(email)
        self.page.get_by_label("Password").fill(password)
        self.page.get_by_role("button", name=re.compile("^Sign in$", re.I)).click()
        expect(self.page.get_by_text(re.compile("Signed in|Taking you|account", re.I)).first).to_be_visible(timeout=25_000)


def expect_sign_in_form(page: Page) -> None:
    expect(page.get_by_role("heading", name=re.compile("Sign in with email and password", re.I))).to_be_visible()
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password")).to_be_visible()


def expect_sign_up_form(page: Page) -> None:
    expect(page.get_by_role("heading", name=re.compile("Create your Can You Geo", re.I))).to_be_visible()
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password", exact=True)).to_be_visible()
    expect(page.get_by_label("Confirm password")).to_be_visible()
