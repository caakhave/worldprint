from __future__ import annotations

import re

from playwright.sync_api import expect

from pages.base import BasePage
from utils.assertions import assert_no_horizontal_overflow


class MysteryMapPage(BasePage):
    path = "/play/mystery-map/"

    def expect_first_run_intro_cta_cleanup(self) -> None:
        intro = self.page.get_by_label(re.compile("First run intro", re.I))
        expect(intro).to_be_visible()
        expect(intro.get_by_role("button", name=re.compile(r"^Start map 1$", re.I))).to_be_visible()
        expect(intro.get_by_role("button", name=re.compile(r"^Skip intro$", re.I))).to_have_count(0)

    def start_signed_out_sample(self) -> None:
        self.clear_storage()
        self.goto()
        analyst = self.page.get_by_label("Analyst")
        if analyst.count() > 0:
            analyst.check()
        self.page.get_by_role(
            "button",
            name=re.compile(r"Play Mystery Map\s*Start sample game|Start sample game", re.I),
        ).click()
        self.expect_first_run_intro_cta_cleanup()
        self.page.get_by_label(re.compile("First run intro", re.I)).get_by_role("button", name=re.compile("Start map 1", re.I)).click()
        expect(self.page.get_by_role("heading", name=re.compile("Use the map as your clue", re.I))).to_be_visible()
        expect(self.page.get_by_role("heading", name=re.compile("What is this map showing", re.I))).to_be_visible()

    def expect_active_board(self) -> None:
        expect(self.page.get_by_test_id("mystery-map-board")).to_be_visible()
        expect(self.page.get_by_test_id("indicator-answer-panel")).to_be_visible()
        assert_no_horizontal_overflow(self.page)

    def select_canada(self) -> None:
        country = self.page.locator('.country-path[data-iso3="CAN"]').first
        expect(country).to_be_visible()
        country.click()
        expect(self.page.get_by_test_id("country-evidence-panel")).to_contain_text("Canada")
        expect(self.page.get_by_test_id("country-evidence-panel")).not_to_contain_text("Pick a country")
