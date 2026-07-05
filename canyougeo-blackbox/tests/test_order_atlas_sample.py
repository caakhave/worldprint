from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect

from pages.order_atlas import OrderAtlasPage


@pytest.mark.smoke
def test_order_atlas_signed_out_sample_reaches_results(desktop_page, target_base_url: str):
    order = OrderAtlasPage(desktop_page, target_base_url)
    order.start_signed_out_sample()
    order.reorder_once_if_possible()
    order.complete_sample()
    order.expect_results_top()

    results_text = desktop_page.get_by_test_id("order-atlas-results-top").inner_text()
    assert re.search(r"Order Atlas Sample Run Complete|Sample complete", results_text, flags=re.I)
    unsafe_claims = r"streaks?|archive|challenge links?|account-wide saved stats|cloud stats"
    assert not re.search(unsafe_claims, results_text, flags=re.I)

    expect(desktop_page.get_by_role("button", name=re.compile("Play sample again", re.I))).to_be_visible()
