from __future__ import annotations

from playwright.sync_api import expect

from pages.base import BasePage


class HomePage(BasePage):
    path = "/"

    def expect_loaded(self) -> None:
        hero = self.page.get_by_test_id("cinematic-home-hero")
        expect(hero).to_be_visible(timeout=15_000)
        primary_nav = self.page.get_by_label("Primary navigation")
        expect(primary_nav.get_by_role("link", name="Play")).to_be_visible()
