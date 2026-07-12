import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialLinks } from "@/components/SocialLinks";
import { OFFICIAL_SOCIAL_LINKS } from "@/lib/social";

describe("SocialLinks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("renders official social links with accessible names and safe outbound attributes", () => {
    render(<SocialLinks source="footer" />);

    for (const social of OFFICIAL_SOCIAL_LINKS) {
      const link = screen.getByRole("link", { name: `Follow Can You Geo on ${social.label}` });
      expect(link).toHaveAttribute("href", social.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("can show text labels for support surfaces", () => {
    render(<SocialLinks source="support" variant="labeled" />);

    expect(screen.getByText("TikTok")).toBeVisible();
    expect(screen.getByText("Instagram")).toBeVisible();
    expect(screen.getByText("Facebook")).toBeVisible();
  });

  it("tracks social clicks with neutral select-content analytics only", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-CANYOUGEO");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canyougeo.com");
    vi.stubEnv("NEXT_PUBLIC_NO_INDEX", "false");
    (window as typeof window & { dataLayer?: unknown[] }).dataLayer = [];

    render(<SocialLinks source="footer" />);
    fireEvent.click(screen.getByRole("link", { name: "Follow Can You Geo on TikTok" }));

    expect((window as typeof window & { dataLayer?: unknown[] }).dataLayer).toEqual([
      {
        event: "cgy_select_content",
        content_type: "social_link",
        item_id: "tiktok",
        source: "footer"
      }
    ]);
    expect(JSON.stringify((window as typeof window & { dataLayer?: unknown[] }).dataLayer)).not.toMatch(
      /email|user_id|stripe_session|challenge_recipient|fbp|fbc|pixel/i
    );
  });
});
