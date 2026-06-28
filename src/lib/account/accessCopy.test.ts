import { describe, expect, it } from "vitest";
import {
  accessCopyForPlan,
  archiveAccessLabel,
  practiceAccessLabel,
  statsAccessLabel
} from "@/lib/account/accessCopy";
import { FREE_ENTITLEMENT, GUEST_ENTITLEMENT, PRO_ENTITLEMENT } from "@/lib/account/entitlements";

describe("account access copy", () => {
  it("distinguishes guest sample play from free account play", () => {
    expect(accessCopyForPlan("guest").summary).toContain("sample maps");
    expect(accessCopyForPlan("guest").summary).toContain("Create a free account");
    expect(accessCopyForPlan("free").summary).toContain("fresh Daily play");
    expect(accessCopyForPlan("free").summary).toContain("saved progress");
  });

  it("derives capability labels from the entitlement model", () => {
    expect(practiceAccessLabel(GUEST_ENTITLEMENT)).toBe("Sample practice maps");
    expect(archiveAccessLabel(GUEST_ENTITLEMENT)).toBe("Sample recent Past Games");
    expect(statsAccessLabel(GUEST_ENTITLEMENT)).toBe("Browser-only sample progress");

    expect(practiceAccessLabel(FREE_ENTITLEMENT)).toBe("3-map practice warm-ups");
    expect(archiveAccessLabel(FREE_ENTITLEMENT)).toBe("14 recent Past Games");
    expect(statsAccessLabel(FREE_ENTITLEMENT)).toBe("Saved progress and basic stats");

    expect(practiceAccessLabel(PRO_ENTITLEMENT)).toBe("Full practice atlas");
    expect(archiveAccessLabel(PRO_ENTITLEMENT)).toBe("Complete Past Games archive");
    expect(statsAccessLabel(PRO_ENTITLEMENT)).toBe("Advanced stats");
  });
});
