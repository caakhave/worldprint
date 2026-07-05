from __future__ import annotations

import pytest

from utils.assertions import assert_route_status

PUBLIC_ROUTES = [
    "/",
    "/play/",
    "/play/mystery-map/",
    "/play/pattern-atlas/",
    "/play/order-atlas/",
    "/upgrade/",
    "/sign-in/",
    "/sign-up/",
    "/reset-password/",
    "/privacy/",
    "/terms/",
    "/legal/",
    "/robots.txt",
    "/sitemap.xml",
]


@pytest.mark.smoke
@pytest.mark.parametrize("path", PUBLIC_ROUTES)
def test_public_routes_return_success_or_redirect(target_base_url: str, path: str):
    assert_route_status(target_base_url, path)
