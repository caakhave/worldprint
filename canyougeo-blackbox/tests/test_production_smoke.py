from __future__ import annotations

import pytest

from utils.assertions import assert_route_status
from utils.host_policy import robots_disallows_all, sitemap_has_public_routes

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


@pytest.mark.prod_smoke
def test_production_smoke_indexing_files_are_public(target_base_url: str):
    robots = assert_route_status(target_base_url, "/robots.txt").text
    sitemap = assert_route_status(target_base_url, "/sitemap.xml").text

    assert not robots_disallows_all(robots), "Production robots.txt should not disallow the whole site."
    assert "Sitemap: https://canyougeo.com/sitemap.xml" in robots
    assert "https://canyougeo.com" in sitemap
    assert "https://test.canyougeo.com" not in sitemap
    assert "localhost" not in sitemap
    assert ".pages.dev" not in sitemap
    assert sitemap_has_public_routes(sitemap), "Production sitemap should include public play routes."


@pytest.mark.prod_smoke
def test_production_smoke_public_html_does_not_expose_staging_or_secret_markers(target_base_url: str):
    public_paths = ["/", "/legal/", "/support/"]
    forbidden_markers = [
        "https://test.canyougeo.com",
        "hsgpjtyysbremrokkoym",
        "NEXT_PUBLIC_BILLING_MODE=test",
        "SUPABASE_SERVICE_ROLE_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "RESEND_API_KEY",
        "whsec_",
        "sk_live_",
        "sk_test_",
    ]

    for path in public_paths:
        html = assert_route_status(target_base_url, path).text
        for marker in forbidden_markers:
            assert marker not in html, f"{path} exposed forbidden production smoke marker: {marker}"
