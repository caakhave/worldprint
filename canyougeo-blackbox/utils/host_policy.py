from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class HostPolicy:
    host: str
    kind: str
    should_be_private: bool
    enforce_security_headers: bool


def policy_for_base_url(base_url: str) -> HostPolicy:
    host = urlparse(base_url).hostname or ""
    normalized = host.lower()

    if normalized in {"localhost", "127.0.0.1", "::1"}:
        return HostPolicy(host=normalized, kind="local", should_be_private=False, enforce_security_headers=False)

    if normalized == "test.canyougeo.com" or normalized.startswith("staging."):
        return HostPolicy(host=normalized, kind="private_qa", should_be_private=True, enforce_security_headers=True)

    if normalized in {"canyougeo.com", "www.canyougeo.com", "canyougeo.pages.dev"}:
        return HostPolicy(host=normalized, kind="production", should_be_private=False, enforce_security_headers=True)

    if normalized.endswith(".pages.dev"):
        return HostPolicy(host=normalized, kind="preview", should_be_private=True, enforce_security_headers=True)

    return HostPolicy(host=normalized, kind="custom", should_be_private=False, enforce_security_headers=True)


def response_has_noindex(headers: dict[str, str], html: str) -> bool:
    x_robots = headers.get("x-robots-tag", "")
    if "noindex" in x_robots.lower():
        return True

    return bool(
        re.search(
            r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex',
            html,
            flags=re.IGNORECASE,
        )
    )


def robots_disallows_all(robots_txt: str) -> bool:
    lines = []
    for raw_line in robots_txt.splitlines():
        line = raw_line.split("#", 1)[0].strip().lower()
        if line:
            lines.append(line)

    return "user-agent: *" in lines and "disallow: /" in lines


def sitemap_has_public_routes(sitemap_xml: str) -> bool:
    return "/play/" in sitemap_xml and "/play/order-atlas/" in sitemap_xml
