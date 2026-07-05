from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect

from pages.home import HomePage
from pages.play_hub import PlayHubPage
from utils.assertions import assert_no_horizontal_overflow


@pytest.mark.smoke
def test_homepage_hero_loads(desktop_page, target_base_url: str):
    home = HomePage(desktop_page, target_base_url)
    home.goto()
    home.expect_loaded()
    expect(desktop_page.get_by_text(re.compile("Mystery Map", re.I)).first).to_be_visible()
    expect(desktop_page.get_by_text(re.compile("Pattern Atlas", re.I)).first).to_be_visible()
    expect(desktop_page.get_by_text(re.compile("Order Atlas", re.I)).first).to_be_visible()
    assert_no_horizontal_overflow(desktop_page)


@pytest.mark.smoke
def test_play_hub_shows_three_games_and_routes(desktop_page, target_base_url: str):
    hub = PlayHubPage(desktop_page, target_base_url)
    hub.goto()
    hub.expect_three_game_hub()

    expectations = {
        "Open Mystery Map": r"/play/mystery-map/?$",
        "Open Pattern Atlas": r"/play/pattern-atlas/?$",
        "Open Order Atlas": r"/play/order-atlas/?$",
    }
    for label, href_pattern in expectations.items():
        link = desktop_page.get_by_role("link", name=re.compile(label, re.I)).first
        expect(link).to_be_visible()
        expect(link).to_have_attribute("href", re.compile(href_pattern))

    assert_no_horizontal_overflow(desktop_page)
