from __future__ import annotations

import re

from playwright.sync_api import expect

from pages.base import BasePage
from utils.assertions import assert_no_horizontal_overflow


class OrderAtlasPage(BasePage):
    path = "/play/order-atlas/"

    def start_signed_out_sample(self) -> None:
        self.clear_storage()
        self.goto()
        self.page.wait_for_load_state("networkidle")
        sample_button = self.page.get_by_role(
            "button",
            name=re.compile("Start sample run|Play sample again|Resume Sample Run", re.I),
        ).first
        expect(sample_button).to_be_enabled(timeout=15_000)
        sample_button.click()
        self.expect_active_round()

    def expect_active_round(self) -> None:
        expect(self.page.get_by_role("heading", name="Move the cards into order.")).to_be_visible()
        expect(self.page.get_by_text("Value hidden").first).to_be_visible()
        expect(self.page.get_by_role("button", name="Submit order")).to_be_visible()
        assert_no_horizontal_overflow(self.page)

    def reorder_once_if_possible(self) -> None:
        move_down = self.page.get_by_label(re.compile(r"Move .+ down", re.I)).first
        if move_down.count() > 0 and move_down.is_enabled():
            move_down.click()

    def complete_sample(self) -> None:
        for round_index in range(3):
            self.page.get_by_role("button", name="Submit order").click()
            expect(self.page.get_by_role("heading", name=re.compile("points$", re.I)).first).to_be_visible()
            self.page.get_by_role("button", name="Open results" if round_index == 2 else "Next round").first.click()

    def expect_results_top(self) -> None:
        results_top = self.page.get_by_test_id("order-atlas-results-top")
        expect(results_top).to_be_visible()
        expect(results_top).to_be_in_viewport()
