from __future__ import annotations

import pytest

from utils.assertions import assert_route_status

PRODUCTION_SMOKE_ROUTES = [
    "/",
    "/play/",
    "/play/mystery-map/",
    "/sign-in/",
    "/legal/",
    "/support/",
    "/robots.txt",
    "/sitemap.xml",
]


@pytest.mark.prod_smoke
@pytest.mark.parametrize("path", PRODUCTION_SMOKE_ROUTES)
def test_production_smoke_routes_return_success(target_base_url: str, path: str):
    assert_route_status(target_base_url, path)


@pytest.mark.prod_smoke
def test_production_smoke_core_public_copy_loads(target_base_url: str):
    home = assert_route_status(target_base_url, "/").text
    play = assert_route_status(target_base_url, "/play/").text
    mystery_map = assert_route_status(target_base_url, "/play/mystery-map/").text
    sign_in = assert_route_status(target_base_url, "/sign-in/").text

    assert "Can You Geo" in home
    assert "Mystery Map" in home
    assert "Mystery Map" in play
    assert "Pattern Atlas" in play
    assert "Order Atlas" in play
    assert "Mystery Map" in mystery_map
    assert "Sign in" in sign_in
