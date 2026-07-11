import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingConsentManager } from "@/components/MarketingConsentManager";
import { MARKETING_CONSENT_STORAGE_KEY } from "@/lib/site/analytics";

function enableProductionAnalytics() {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
  vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
}

function dataLayerCommands() {
  return ((window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? []).map((entry) =>
    typeof entry === "object" && entry && "length" in entry ? Array.from(entry as ArrayLike<unknown>) : entry
  );
}

describe("MarketingConsentManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("renders marketing cookie controls on staging even when analytics delivery is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://test.canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "true");

    render(<MarketingConsentManager />);

    expect(await screen.findByRole("button", { name: "Cookie settings" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Marketing cookies" })).toBeVisible();
  });

  it("emits the consent grant event on staging without enabling vendor pixels in app code", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://test.canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "true");
    const user = userEvent.setup();

    render(<MarketingConsentManager />);

    await user.click(await screen.findByRole("button", { name: "Accept marketing cookies" }));

    expect(dataLayerCommands()).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "granted",
          ad_personalization: "granted",
          ad_user_data: "granted"
        }
      ],
      { event: "cgy_marketing_consent_granted" }
    ]);
  });

  it("declines marketing cookies and updates ad consent to denied without emitting a grant event", async () => {
    enableProductionAnalytics();
    const user = userEvent.setup();

    render(<MarketingConsentManager />);

    expect(await screen.findByRole("dialog", { name: "Marketing cookies" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continue without marketing cookies" }));

    expect(window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY)).toBe("denied");
    expect(screen.queryByRole("dialog", { name: "Marketing cookies" })).not.toBeInTheDocument();
    expect(dataLayerCommands()).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "denied",
          ad_personalization: "denied",
          ad_user_data: "denied"
        }
      ]
    ]);
  });

  it("accepts marketing cookies, persists the choice, and emits the grant event", async () => {
    enableProductionAnalytics();
    const user = userEvent.setup();

    render(<MarketingConsentManager />);

    expect(await screen.findByRole("dialog", { name: "Marketing cookies" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Accept marketing cookies" }));

    expect(window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY)).toBe("granted");
    expect(dataLayerCommands()).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "granted",
          ad_personalization: "granted",
          ad_user_data: "granted"
        }
      ],
      { event: "cgy_marketing_consent_granted" }
    ]);
  });

  it("uses the persisted choice and lets the player change cookie settings later", async () => {
    enableProductionAnalytics();
    window.localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, "granted");
    const user = userEvent.setup();

    render(<MarketingConsentManager />);

    expect(await screen.findByRole("button", { name: "Cookie settings" })).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Marketing cookies" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(await screen.findByRole("dialog", { name: "Marketing cookies" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Turn off marketing cookies" }));

    expect(window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY)).toBe("denied");
    expect(dataLayerCommands()).toEqual([
      [
        "consent",
        "update",
        {
          ad_storage: "denied",
          ad_personalization: "denied",
          ad_user_data: "denied"
        }
      ]
    ]);
  });
});
