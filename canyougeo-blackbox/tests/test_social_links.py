from __future__ import annotations

import pytest
from playwright.sync_api import expect

from utils.assertions import normalize_url

SOCIAL_LINKS = {
    "TikTok": "https://www.tiktok.com/@canyougeo",
    "Instagram": "https://www.instagram.com/canyougeo",
    "Facebook": "https://www.facebook.com/canyougeo",
}


@pytest.mark.smoke
@pytest.mark.production_safe
def test_footer_social_links_are_public(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/"), wait_until="domcontentloaded")
    footer = desktop_page.locator("footer")

    for label, href in SOCIAL_LINKS.items():
        link = footer.get_by_role("link", name=f"Follow Can You Geo on {label}")
        expect(link).to_be_visible()
        expect(link).to_have_attribute("href", href)
        expect(link).to_have_attribute("target", "_blank")
        expect(link).to_have_attribute("rel", "noopener noreferrer")


@pytest.mark.smoke
@pytest.mark.production_safe
def test_support_page_social_links_are_public(desktop_page, target_base_url: str):
    desktop_page.goto(normalize_url(target_base_url, "/support/"), wait_until="domcontentloaded")
    main = desktop_page.locator("main")

    expect(main.get_by_role("heading", name="Follow Can You Geo")).to_be_visible()
    expect(main.get_by_text("For updates, new games, and daily geography challenges.")).to_be_visible()
    for label, href in SOCIAL_LINKS.items():
        link = main.get_by_role("link", name=f"Follow Can You Geo on {label}")
        expect(link).to_be_visible()
        expect(link).to_have_attribute("href", href)
        expect(link).to_have_attribute("target", "_blank")
        expect(link).to_have_attribute("rel", "noopener noreferrer")
