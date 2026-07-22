from __future__ import annotations

import pytest
from playwright.sync_api import expect

from pages.mystery_map import MysteryMapPage
from pages.pattern_atlas import PatternAtlasPage
from utils.assertions import assert_no_horizontal_overflow, normalize_url

MOBILE_ROUTES = [
    "/",
    "/play/",
    "/play/mystery-map/",
    "/play/pattern-atlas/",
    "/play/order-atlas/",
    "/upgrade/",
    "/sign-in/",
    "/account/",
]


@pytest.mark.mobile
@pytest.mark.production_safe
@pytest.mark.parametrize("path", MOBILE_ROUTES)
def test_mobile_routes_do_not_horizontally_overflow(mobile_page, target_base_url: str, path: str):
    mobile_page.goto(normalize_url(target_base_url, path), wait_until="domcontentloaded")
    assert_no_horizontal_overflow(mobile_page)


@pytest.mark.mobile
@pytest.mark.smoke
@pytest.mark.production_safe
def test_mystery_map_mobile_board_visible(mobile_page, target_base_url: str):
    mystery = MysteryMapPage(mobile_page, target_base_url)
    mystery.start_signed_out_sample()
    board = mobile_page.get_by_test_id("mystery-map-board")
    expect(board).to_be_visible()
    box = board.bounding_box()
    assert box is not None
    assert box["width"] > 300
    assert box["height"] > 200
    assert_no_horizontal_overflow(mobile_page)


@pytest.mark.mobile
@pytest.mark.smoke
@pytest.mark.production_safe
def test_pattern_atlas_mobile_board_visible(mobile_page, target_base_url: str):
    pattern = PatternAtlasPage(mobile_page, target_base_url)
    pattern.start_signed_out_sample()
    board = mobile_page.get_by_test_id("pattern-atlas-board")
    expect(board).to_be_visible()
    box = board.bounding_box()
    assert box is not None
    assert box["width"] > 300
    assert box["height"] > 200
    assert_no_horizontal_overflow(mobile_page)


@pytest.mark.mobile
@pytest.mark.smoke
@pytest.mark.production_safe
def test_order_atlas_mobile_board_visible(mobile_page, target_base_url: str):
    from pages.order_atlas import OrderAtlasPage

    order = OrderAtlasPage(mobile_page, target_base_url)
    order.start_signed_out_sample()
    board = mobile_page.get_by_role("heading", name="Move the cards into order.")
    expect(board).to_be_visible()
    assert_no_horizontal_overflow(mobile_page)
