from __future__ import annotations

from urllib.parse import urljoin

import httpx
from playwright.sync_api import Locator, Page, expect

DEFAULT_TIMEOUT = 20.0
USER_AGENT = "CanYouGeoBlackboxQA/1.0"


def normalize_url(base_url: str, path: str = "/") -> str:
    if not path:
        path = "/"
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def fetch_route(base_url: str, path: str = "/", *, follow_redirects: bool = False) -> httpx.Response:
    return httpx.get(
        normalize_url(base_url, path),
        follow_redirects=follow_redirects,
        timeout=DEFAULT_TIMEOUT,
        headers={"User-Agent": USER_AGENT},
    )


def assert_route_status(base_url: str, path: str, expected: set[int] | None = None) -> httpx.Response:
    expected = expected or {200, 301, 302, 303, 307, 308}
    response = fetch_route(base_url, path)
    assert response.status_code in expected, (
        f"{normalize_url(base_url, path)} returned {response.status_code}; "
        f"expected one of {sorted(expected)}"
    )
    return response


def assert_no_horizontal_overflow(page: Page, *, max_extra_px: int = 1) -> None:
    metrics = page.evaluate(
        """() => ({
            viewport: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body ? document.body.scrollWidth : 0
        })"""
    )
    widest = max(metrics["documentWidth"], metrics["bodyWidth"])
    assert widest <= metrics["viewport"] + max_extra_px, (
        f"Horizontal overflow: widest content is {widest}px, viewport is {metrics['viewport']}px"
    )


def assert_visible(locator: Locator, label: str, *, timeout: int = 15_000) -> None:
    try:
        expect(locator).to_be_visible(timeout=timeout)
    except AssertionError as exc:
        raise AssertionError(f"Expected visible element: {label}") from exc


def clear_browser_storage(page: Page, base_url: str) -> None:
    page.goto(normalize_url(base_url, "/"), wait_until="domcontentloaded")
    page.evaluate("() => { window.localStorage.clear(); window.sessionStorage.clear(); }")
