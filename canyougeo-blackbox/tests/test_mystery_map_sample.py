from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect

from pages.mystery_map import MysteryMapPage


@pytest.mark.smoke
@pytest.mark.production_safe
def test_mystery_map_signed_out_sample_selection_smoke(desktop_page, target_base_url: str):
    mystery = MysteryMapPage(desktop_page, target_base_url)
    mystery.start_signed_out_sample()
    mystery.expect_active_board()
    mystery.select_canada()
    answer_panel = desktop_page.get_by_test_id("indicator-answer-panel")
    expect(answer_panel).to_be_visible()
    expect(answer_panel.get_by_role("heading", name="What is this map showing?")).to_be_visible()
    answers = answer_panel.get_by_role("button")
    expect(answers.first).to_be_visible()
    assert answers.count() >= 3


@pytest.mark.smoke
@pytest.mark.production_safe
def test_mystery_map_signed_out_sample_reaches_round_reveal(desktop_page, target_base_url: str):
    mystery = MysteryMapPage(desktop_page, target_base_url)
    mystery.start_signed_out_sample()
    mystery.select_canada()
    mystery.solve_current_round_by_trying_visible_choices()

    reveal = desktop_page.get_by_label("Reveal details")
    expect(reveal).to_be_visible()
    expect(reveal.get_by_role("heading", name=re.compile("Why the wrong answers were tempting", re.I))).to_be_visible()
