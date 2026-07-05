from __future__ import annotations

import pytest

from utils.assertions import fetch_route
from utils.host_policy import policy_for_base_url


@pytest.mark.security
@pytest.mark.smoke
def test_basic_security_headers(target_base_url: str):
    policy = policy_for_base_url(target_base_url)
    if not policy.enforce_security_headers:
        pytest.skip("Security headers are not enforced for localhost.")

    response = fetch_route(target_base_url, "/", follow_redirects=True)
    assert response.status_code == 200

    headers = {key.lower(): value for key, value in response.headers.items()}
    csp = headers.get("content-security-policy")
    assert csp, "Content-Security-Policy header is missing."
    assert "default-src" in csp
    assert "script-src" in csp

    if "x-content-type-options" in headers:
        assert headers["x-content-type-options"].lower() == "nosniff"

    if "referrer-policy" in headers:
        assert headers["referrer-policy"].lower() != "unsafe-url"

    if "permissions-policy" in headers:
        assert "camera=()" in headers["permissions-policy"] or "geolocation=()" in headers["permissions-policy"]
