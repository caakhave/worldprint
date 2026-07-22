from __future__ import annotations

import pytest

from utils.assertions import fetch_route
from utils.host_policy import policy_for_base_url, response_has_noindex, robots_disallows_all, sitemap_has_public_routes
from utils.route_policy import INDEXED_PUBLIC_ROUTES, NOINDEX_ROUTE_PREFIXES


@pytest.mark.production_safe
def test_robots_disallows_all_ignores_route_specific_private_paths():
    robots = """
    User-Agent: *
    Allow: /
    Disallow: /account/
    Disallow: /sign-in/
    Sitemap: https://canyougeo.com/sitemap.xml
    """

    assert not robots_disallows_all(robots)


@pytest.mark.production_safe
def test_robots_disallows_all_detects_exact_root_disallow():
    robots = """
    User-Agent: *
    Disallow: / # private QA host
    """

    assert robots_disallows_all(robots)


@pytest.mark.indexing
@pytest.mark.smoke
@pytest.mark.production_safe
def test_host_indexing_policy(target_base_url: str):
    policy = policy_for_base_url(target_base_url)
    if policy.kind == "local":
        pytest.skip("Localhost indexing policy is not enforced.")

    home = fetch_route(target_base_url, "/", follow_redirects=True)
    if home.status_code >= 400:
        pytest.xfail(f"{policy.host} returned {home.status_code}; indexing cannot be evaluated from this response.")

    robots = fetch_route(target_base_url, "/robots.txt", follow_redirects=True)
    sitemap = fetch_route(target_base_url, "/sitemap.xml", follow_redirects=True)

    noindex = response_has_noindex(dict(home.headers), home.text)
    robots_private = robots.status_code == 200 and robots_disallows_all(robots.text)

    if policy.should_be_private:
        assert noindex or robots_private, f"{policy.host} should be private/noindexed for QA."
        return

    assert not noindex, f"{policy.host} homepage is marked noindex."
    assert not robots_private, f"{policy.host} robots.txt disallows the full site."
    if sitemap.status_code == 200:
        assert sitemap_has_public_routes(sitemap.text), "Production sitemap should include public play routes."


@pytest.mark.indexing
@pytest.mark.production_safe
def test_internal_review_route_absent_from_sitemap(target_base_url: str):
    sitemap = fetch_route(target_base_url, "/sitemap.xml", follow_redirects=True)
    assert sitemap.status_code == 200
    assert "/internal/order-atlas-review" not in sitemap.text


@pytest.mark.indexing
@pytest.mark.production_safe
def test_sitemap_matches_public_indexable_route_policy(target_base_url: str):
    policy = policy_for_base_url(target_base_url)
    if policy.should_be_private:
        pytest.skip("Private QA hosts may noindex or suppress sitemap indexing.")

    sitemap = fetch_route(target_base_url, "/sitemap.xml", follow_redirects=True)
    assert sitemap.status_code == 200
    for path in INDEXED_PUBLIC_ROUTES:
        assert f"https://canyougeo.com{path}" in sitemap.text

    for prefix in NOINDEX_ROUTE_PREFIXES:
        assert f"https://canyougeo.com{prefix}" not in sitemap.text
    assert "https://test.canyougeo.com" not in sitemap.text
    assert "localhost" not in sitemap.text
    assert ".pages.dev" not in sitemap.text
