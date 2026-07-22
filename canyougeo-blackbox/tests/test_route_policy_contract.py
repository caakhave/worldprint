from __future__ import annotations

import re
from pathlib import Path

import pytest

from utils.route_policy import INDEXED_PUBLIC_ROUTES, NOINDEX_ROUTE_PREFIXES, ROUTES_BY_PATH

REPO_ROOT = Path(__file__).resolve().parents[2]


def _source_text(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


@pytest.mark.production_safe
def test_authoritative_public_routes_have_blackbox_policy():
    seo_source = _source_text("src/lib/site/seo.ts")
    source_paths = tuple(re.findall(r'path:\s*"([^"]+)"', seo_source))

    assert set(INDEXED_PUBLIC_ROUTES) == set(source_paths)
    for path in source_paths:
        assert ROUTES_BY_PATH[path].indexable


@pytest.mark.production_safe
def test_noindex_prefixes_match_source_policy():
    seo_source = _source_text("src/lib/site/seo.ts")
    robots_source = _source_text("src/app/robots.ts")

    for prefix in NOINDEX_ROUTE_PREFIXES:
        assert f'"{prefix}"' in seo_source
        assert f'"{prefix}"' in robots_source


@pytest.mark.production_safe
def test_mandatory_browser_routes_have_explicit_policy():
    required_paths = {
        "/",
        "/play/",
        "/play/mystery-map/",
        "/play/pattern-atlas/",
        "/play/order-atlas/",
        "/past-games/",
        "/challenge/mystery-map/",
        "/upgrade/",
        "/account/",
        "/account/stats/",
        "/account-deletion/",
        "/support/",
        "/legal/",
        "/privacy/",
        "/terms/",
        "/sign-in/",
        "/sign-up/",
        "/reset-password/",
        "/auth/callback/",
        "/daily-geography-game/",
        "/map-quiz/",
        "/choropleth-map-game/",
        "/country-guessing-game/",
        "/.well-known/apple-app-site-association",
        "/.well-known/assetlinks.json",
        "/robots.txt",
        "/sitemap.xml",
    }

    assert required_paths <= set(ROUTES_BY_PATH)


@pytest.mark.production_safe
def test_generated_blackbox_reports_are_ignored():
    ignore = _source_text("canyougeo-blackbox/.gitignore")

    assert "reports/*" in ignore
    assert "reports/screenshots/*" in ignore
    assert ".env" in ignore
