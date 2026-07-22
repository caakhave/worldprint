from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect

from pages.pattern_atlas import PatternAtlasPage


@pytest.mark.smoke
@pytest.mark.production_safe
def test_pattern_atlas_signed_out_sample_smoke(desktop_page, target_base_url: str):
    pattern = PatternAtlasPage(desktop_page, target_base_url)
    pattern.start_signed_out_sample()
    pattern.expect_active_board()
    expect(desktop_page.get_by_role("button", name=re.compile("Reveal category|Reveal one highlighted|Reveal one country", re.I)).first).to_be_visible()
    expect(desktop_page.get_by_role("button", name=re.compile("Countries|Mapped|Top|Central|Island|Landlocked", re.I)).first).to_be_visible()


@pytest.mark.smoke
@pytest.mark.production_safe
def test_pattern_atlas_signed_out_sample_reaches_results(desktop_page, target_base_url: str):
    pattern = PatternAtlasPage(desktop_page, target_base_url)
    pattern.start_signed_out_sample()
    pattern.complete_sample()
    pattern.expect_results_summary()
    expect(desktop_page.get_by_label("Sample completion actions").get_by_role("link", name=re.compile("Start Pro", re.I))).to_be_visible()
