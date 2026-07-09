from __future__ import annotations

import pytest

from utils.cloudflare_access import cloudflare_access_headers, looks_like_cloudflare_access_login
from utils.targets import resolve_base_url


def test_default_target_resolves_to_test_host():
    assert resolve_base_url(env={}) == "https://test.canyougeo.com"


@pytest.mark.parametrize(
    ("target", "expected"),
    [
        ("test", "https://test.canyougeo.com"),
        ("www", "https://www.canyougeo.com"),
        ("apex", "https://canyougeo.com"),
        ("local", "http://localhost:3000"),
    ],
)
def test_cgy_target_resolves_named_hosts(target: str, expected: str):
    assert resolve_base_url(env={"CGY_TARGET": target}) == expected


def test_cgy_base_url_overrides_target():
    assert (
        resolve_base_url(env={"CGY_TARGET": "apex", "CGY_BASE_URL": "https://preview.example.test/"})
        == "https://preview.example.test"
    )


def test_cli_base_url_overrides_env_base_url_and_target():
    assert (
        resolve_base_url(
            "https://manual.example.test/",
            env={"CGY_TARGET": "apex", "CGY_BASE_URL": "https://preview.example.test"},
        )
        == "https://manual.example.test"
    )


def test_unknown_target_has_clear_error():
    with pytest.raises(ValueError, match="Unknown CGY_TARGET 'mars'.*apex, local, test, www"):
        resolve_base_url(env={"CGY_TARGET": "mars"})


def test_cloudflare_access_headers_are_used_for_test_host_only():
    env = {
        "CGY_CF_ACCESS_CLIENT_ID": "client-id",
        "CGY_CF_ACCESS_CLIENT_SECRET": "client-secret",
    }

    assert cloudflare_access_headers("https://test.canyougeo.com", env=env) == {
        "CF-Access-Client-Id": "client-id",
        "CF-Access-Client-Secret": "client-secret",
    }
    assert cloudflare_access_headers("https://canyougeo.com", env=env) == {}
    assert cloudflare_access_headers("https://www.canyougeo.com", env=env) == {}
    assert cloudflare_access_headers("http://localhost:3000", env=env) == {}


def test_cloudflare_access_headers_are_optional_for_test_host():
    assert cloudflare_access_headers("https://test.canyougeo.com", env={}) == {}


def test_cloudflare_access_login_marker_detection():
    assert looks_like_cloudflare_access_login("<title>Cloudflare Access</title>")
    assert not looks_like_cloudflare_access_login("<main>Can You Geo?</main>")
