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
    expect(accessCopyForPlan("guest").summary).toContain("sample maps never change");
    expect(accessCopyForPlan("guest").summary).toContain("Create a free account");
    expect(accessCopyForPlan("free").summary).toContain("3-map Free Daily");
    expect(accessCopyForPlan("free").summary).toContain("saved results");
  });

  it("derives capability labels from the entitlement model", () => {
    expect(practiceAccessLabel(GUEST_ENTITLEMENT)).toBe("5-map Sample Run");
    expect(archiveAccessLabel(GUEST_ENTITLEMENT)).toBe("No Past Games access");
    expect(statsAccessLabel(GUEST_ENTITLEMENT)).toBe("No saved Sample Run stats");

    expect(practiceAccessLabel(FREE_ENTITLEMENT)).toBe("3-map Practice sets");
    expect(archiveAccessLabel(FREE_ENTITLEMENT)).toBe("14 recent Past Games");
    expect(statsAccessLabel(FREE_ENTITLEMENT)).toBe("Saved progress and basic stats");

    expect(practiceAccessLabel(PRO_ENTITLEMENT)).toBe("Full Practice Atlas");
    expect(archiveAccessLabel(PRO_ENTITLEMENT)).toBe("Complete Past Games archive");
    expect(statsAccessLabel(PRO_ENTITLEMENT)).toBe("Advanced stats");
  });
});
