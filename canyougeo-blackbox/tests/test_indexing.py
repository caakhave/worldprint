from __future__ import annotations

import pytest

from utils.assertions import fetch_route
from utils.host_policy import policy_for_base_url, response_has_noindex, robots_disallows_all, sitemap_has_public_routes


@pytest.mark.indexing
@pytest.mark.smoke
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
def test_internal_review_route_absent_from_sitemap(target_base_url: str):
    sitemap = fetch_route(target_base_url, "/sitemap.xml", follow_redirects=True)
    assert sitemap.status_code == 200
    assert "/internal/order-atlas-review" not in sitemap.text
