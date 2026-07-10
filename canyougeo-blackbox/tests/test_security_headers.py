from __future__ import annotations

import pytest

from utils.assertions import fetch_route
from utils.host_policy import policy_for_base_url


@pytest.mark.security
@pytest.mark.smoke
@pytest.mark.prod_smoke
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
    assert "object-src 'none'" in csp
    assert "base-uri 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "connect-src" in csp
    assert "https://*.supabase.co" in csp
    assert "wss://*.supabase.co" in csp
    assert "https://www.google.com" in csp
    assert "'unsafe-eval'" not in csp

    assert headers.get("x-content-type-options", "").lower() == "nosniff"
    assert headers.get("referrer-policy", "").lower() == "strict-origin-when-cross-origin"

    x_frame_options = headers.get("x-frame-options", "").lower()
    assert x_frame_options == "deny" or "frame-ancestors 'none'" in csp

    permissions_policy = headers.get("permissions-policy", "")
    assert "camera=()" in permissions_policy
    assert "geolocation=()" in permissions_policy
    assert "microphone=()" in permissions_policy
