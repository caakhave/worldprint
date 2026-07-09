from __future__ import annotations

import os
from collections.abc import Mapping
from urllib.parse import urlparse

ACCESS_CLIENT_ID_ENV = ("CGY_CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_ID")
ACCESS_CLIENT_SECRET_ENV = ("CGY_CF_ACCESS_CLIENT_SECRET", "CF_ACCESS_CLIENT_SECRET")
ACCESS_PROTECTED_HOSTS = {"test.canyougeo.com"}

ACCESS_LOGIN_MARKERS = (
    "Cloudflare Access",
    "cloudflareaccess.com",
    "/cdn-cgi/access",
    "CF_Authorization",
)


def _first_env_value(env: Mapping[str, str | None], names: tuple[str, ...]) -> str | None:
    for name in names:
        value = env.get(name)
        if value:
            return value
    return None


def is_access_protected_host(base_url: str) -> bool:
    return urlparse(base_url).hostname in ACCESS_PROTECTED_HOSTS


def cloudflare_access_headers(
    base_url: str,
    env: Mapping[str, str | None] | None = None,
) -> dict[str, str]:
    env = os.environ if env is None else env
    if not is_access_protected_host(base_url):
        return {}

    client_id = _first_env_value(env, ACCESS_CLIENT_ID_ENV)
    client_secret = _first_env_value(env, ACCESS_CLIENT_SECRET_ENV)
    if not client_id or not client_secret:
        return {}

    return {
        "CF-Access-Client-Id": client_id,
        "CF-Access-Client-Secret": client_secret,
    }


def looks_like_cloudflare_access_login(text: str) -> bool:
    if not text:
        return False
    return any(marker in text for marker in ACCESS_LOGIN_MARKERS)
