from __future__ import annotations

import re

from playwright.sync_api import expect

from pages.base import BasePage


class PlayHubPage(BasePage):
    path = "/play/"

    def expect_three_game_hub(self) -> None:
        expect(self.page.get_by_role("heading", name=re.compile("Choose your geography game", re.I))).to_be_visible()
        for game in ("Mystery Map", "Pattern Atlas", "Order Atlas"):
            expect(self.page.get_by_text(game).first).to_be_visible()

    def cta(self, name: str):
        return self.page.get_by_role("link", name=re.compile(name, re.I)).first
