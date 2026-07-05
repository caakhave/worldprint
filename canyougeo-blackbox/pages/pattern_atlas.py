from __future__ import annotations

import re

from playwright.sync_api import expect

from pages.base import BasePage
from utils.assertions import assert_no_horizontal_overflow


class PatternAtlasPage(BasePage):
    path = "/play/pattern-atlas/"

    def start_signed_out_sample(self) -> None:
        self.clear_storage()
        self.goto()
        self.page.get_by_role("button", name=re.compile("Start sample run|Play sample again|Resume Sample Run", re.I)).click()
        expect(self.page.get_by_role("heading", name=re.compile("What pattern connects these countries", re.I))).to_be_visible()

    def expect_active_board(self) -> None:
        expect(self.page.get_by_test_id("pattern-atlas-board")).to_be_visible()
        expect(self.page.get_by_role("heading", name=re.compile("Which rule is shown", re.I))).to_be_visible()
        expect(self.page.get_by_role("button", name=re.compile("Reveal", re.I)).first).to_be_visible()
        assert_no_horizontal_overflow(self.page)
