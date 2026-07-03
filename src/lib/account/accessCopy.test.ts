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
    expect(accessCopyForPlan("guest").headline).toBe("Try sample runs.");
    expect(accessCopyForPlan("guest").summary).toContain("Samples stay local");
    expect(accessCopyForPlan("guest").summary).toContain("Create a free account");
    expect(accessCopyForPlan("free").summary).toContain("Daily rounds in Daily-enabled games");
    expect(accessCopyForPlan("free").summary).toContain("saved results");
    expect(accessCopyForPlan("pro").summary).toContain("Mystery Map Custom Atlas");
    expect(accessCopyForPlan("pro").summary).toContain("Pattern Atlas Pattern Runs");
    expect(accessCopyForPlan("pro").summary).not.toContain("Practice Atlas");
  });

  it("derives capability labels from the entitlement model", () => {
    expect(practiceAccessLabel(GUEST_ENTITLEMENT)).toBe("Sample runs only");
    expect(archiveAccessLabel(GUEST_ENTITLEMENT)).toBe("No Past Games access");
    expect(statsAccessLabel(GUEST_ENTITLEMENT)).toBe("No saved Sample Run stats");

    expect(practiceAccessLabel(FREE_ENTITLEMENT)).toBe("3-map supported practice");
    expect(archiveAccessLabel(FREE_ENTITLEMENT)).toBe("14 recent Past Games");
    expect(statsAccessLabel(FREE_ENTITLEMENT)).toBe("Saved progress and basic stats");

    expect(practiceAccessLabel(PRO_ENTITLEMENT)).toBe("Supported Pro practice");
    expect(archiveAccessLabel(PRO_ENTITLEMENT)).toBe("Complete Past Games archive");
    expect(statsAccessLabel(PRO_ENTITLEMENT)).toBe("Advanced stats");
  });
});
