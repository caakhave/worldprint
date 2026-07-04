import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata } from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("renders the shared legal content at the direct privacy route", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "Terms & Privacy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cookies, Local Storage, and Session Storage" })).toBeVisible();
  });

  it("has direct privacy metadata", () => {
    expect(metadata.title).toBe("Privacy Policy - Can You Geo?");
    expect(metadata.alternates?.canonical).toBe("https://canyougeo.com/privacy/");
  });
});
