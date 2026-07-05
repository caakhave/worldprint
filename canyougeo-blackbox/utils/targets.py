from __future__ import annotations

from collections.abc import Mapping

TARGET_BASE_URLS = {
    "test": "https://test.canyougeo.com",
    "www": "https://www.canyougeo.com",
    "apex": "https://canyougeo.com",
    "local": "http://localhost:3000",
}

DEFAULT_TARGET = "test"


def clean_base_url(value: str | None) -> str:
    return (value or TARGET_BASE_URLS[DEFAULT_TARGET]).rstrip("/")


def resolve_base_url(cli_base_url: str | None = None, env: Mapping[str, str | None] | None = None) -> str:
    env = env or {}

    if cli_base_url:
        return clean_base_url(cli_base_url)

    env_base_url = env.get("CGY_BASE_URL")
    if env_base_url:
        return clean_base_url(env_base_url)

    target = (env.get("CGY_TARGET") or DEFAULT_TARGET).strip().lower()
    try:
        return TARGET_BASE_URLS[target]
    except KeyError as exc:
        expected = ", ".join(sorted(TARGET_BASE_URLS))
        raise ValueError(f"Unknown CGY_TARGET '{target}'. Expected one of: {expected}.") from exc
