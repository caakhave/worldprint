from __future__ import annotations

import time

from playwright.sync_api import Page

ANALYTICS_CONSOLE_PREFIX = "__cgy_blackbox_event__:"


def capture_data_layer_event_names(page: Page) -> list[str]:
    events: list[str] = []

    def capture_console_message(message) -> None:
        text = message.text
        if text.startswith(ANALYTICS_CONSOLE_PREFIX):
            events.append(text.removeprefix(ANALYTICS_CONSOLE_PREFIX))

    page.on("console", capture_console_message)
    page.evaluate(
        """(prefix) => {
          const layer = window.dataLayer = window.dataLayer || [];
          const emit = (item) => {
            if (item && typeof item.event === "string" && item.event.startsWith("cgy_")) {
              console.info(`${prefix}${item.event}`);
            }
          };
          layer.forEach(emit);
          if (layer.__cgyBlackboxPatched) return;
          const originalPush = layer.push.bind(layer);
          Object.defineProperty(layer, "__cgyBlackboxPatched", {
            configurable: false,
            enumerable: false,
            value: true,
          });
          layer.push = function (...items) {
            items.forEach(emit);
            return originalPush(...items);
          };
        }""",
        ANALYTICS_CONSOLE_PREFIX,
    )
    return events


def wait_for_event_name(page: Page, events: list[str], event_name: str, *, timeout_ms: int = 15_000) -> None:
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
        if event_name in events:
            return
        page.wait_for_timeout(100)
    raise AssertionError(f"Expected analytics event {event_name!r}; captured events: {sorted(set(events))}")


def event_count(events: list[str], event_name: str) -> int:
    return sum(1 for event in events if event == event_name)
