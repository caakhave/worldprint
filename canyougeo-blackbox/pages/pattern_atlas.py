from __future__ import annotations

import re

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, expect

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

    def solve_current_pattern_by_trying_visible_choices(self) -> None:
        reveal = self.page.get_by_label("Pattern Atlas reveal details")
        for _ in range(6):
            choice = self.page.get_by_label("Answer actions").locator(".choice-button:not([disabled])").first
            expect(choice).to_be_visible()
            choice.click()
            try:
                reveal.wait_for(state="visible", timeout=3_000)
                expect(reveal.get_by_role("button", name=re.compile("Next pattern|Open summary", re.I))).to_be_visible()
                return
            except PlaywrightTimeoutError:
                continue
        raise AssertionError("Pattern Atlas did not reach the reveal view after trying visible choices.")

    def complete_sample(self) -> None:
        for round_index in range(3):
            self.solve_current_pattern_by_trying_visible_choices()
            next_label = "Open summary" if round_index == 2 else "Next pattern"
            self.page.get_by_role("button", name=next_label).click()

    def expect_results_summary(self) -> None:
        expect(self.page.get_by_text(re.compile("Pattern Atlas Sample Run complete", re.I)).first).to_be_visible()
        expect(self.page.get_by_label("Per-round scores")).to_be_visible()
        assert_no_horizontal_overflow(self.page)
