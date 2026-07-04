import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage, { metadata } from "@/app/terms/page";

describe("TermsPage", () => {
  it("renders the shared legal content at the direct terms route", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "Terms & Privacy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Free and Pro Access" })).toBeVisible();
  });

  it("has direct terms metadata", () => {
    expect(metadata.title).toBe("Terms of Use - Can You Geo?");
    expect(metadata.alternates?.canonical).toBe("https://canyougeo.com/terms/");
  });
});
