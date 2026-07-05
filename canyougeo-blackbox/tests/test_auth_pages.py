from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect

from pages.auth import expect_sign_in_form, expect_sign_up_form
from utils.assertions import normalize_url


@pytest.mark.smoke
def test_sign_in_page_loads(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/sign-in/"), wait_until="domcontentloaded")
    expect_sign_in_form(desktop_page)
    expect(desktop_page.get_by_text(re.compile("Free needs no card|daily geography challenges", re.I)).first).to_be_visible()


@pytest.mark.smoke
def test_sign_up_page_loads(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/sign-up/"), wait_until="domcontentloaded")
    expect_sign_up_form(desktop_page)
    expect(desktop_page.get_by_text(re.compile("No credit card", re.I))).to_be_visible()


@pytest.mark.smoke
def test_reset_password_page_loads(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/reset-password/"), wait_until="domcontentloaded")
    expect(desktop_page.get_by_text(re.compile("New password", re.I)).first).to_be_visible()
    expect(desktop_page.get_by_text(re.compile("reset email|reset link|Choose a new password", re.I)).first).to_be_visible()
