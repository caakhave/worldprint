import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UpgradePage from "@/app/upgrade/page";

vi.mock("@/features/account/UpgradeClient", () => ({
  UpgradeClient: () => <div>Upgrade client</div>
}));

describe("UpgradePage", () => {
  it("renders the upgrade client and breadcrumb JSON-LD", () => {
    const { container } = render(<UpgradePage />);

    expect(screen.getByText("Upgrade client")).toBeVisible();
    const breadcrumbSchema = JSON.parse(container.querySelector("#canyougeo-upgrade-breadcrumb-jsonld")?.textContent ?? "{}");
    expect(breadcrumbSchema).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Can You Geo?", item: "https://canyougeo.com/" },
        { position: 2, name: "Free and Pro", item: "https://canyougeo.com/upgrade/" }
      ]
    });
  });
});
