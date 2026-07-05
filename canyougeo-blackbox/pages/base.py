from __future__ import annotations

from playwright.sync_api import Page

from utils.assertions import clear_browser_storage, normalize_url


class BasePage:
    path = "/"

    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url

    def goto(self, path: str | None = None, *, wait_until: str = "domcontentloaded") -> None:
        self.page.goto(normalize_url(self.base_url, path or self.path), wait_until=wait_until)

    def clear_storage(self) -> None:
        clear_browser_storage(self.page, self.base_url)

    def body_text(self) -> str:
        return self.page.locator("body").inner_text(timeout=10_000)
