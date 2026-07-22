import { describe, expect, it, vi } from "vitest";
import { startAppleStoreKitPurchase } from "@/features/account/appleStoreKitActions";

const appleStoreKitMock = vi.hoisted(() => ({
  finishVerifiedAppleStoreKitTransactions: vi.fn(),
  manageAppleStoreKitSubscription: vi.fn(),
  purchaseAppleStoreKitProduct: vi.fn(),
  restoreAppleStoreKitPurchases: vi.fn(),
  syncUnfinishedAppleStoreKitTransactions: vi.fn()
}));

vi.mock("@/lib/mobile/appleStoreKit", () => ({
  finishVerifiedAppleStoreKitTransactions: appleStoreKitMock.finishVerifiedAppleStoreKitTransactions,
  manageAppleStoreKitSubscription: appleStoreKitMock.manageAppleStoreKitSubscription,
  purchaseAppleStoreKitProduct: appleStoreKitMock.purchaseAppleStoreKitProduct,
  restoreAppleStoreKitPurchases: appleStoreKitMock.restoreAppleStoreKitPurchases,
  syncUnfinishedAppleStoreKitTransactions: appleStoreKitMock.syncUnfinishedAppleStoreKitTransactions
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabasePublicConfig: () => ({
    url: "https://jquebthneczqdxagagof.supabase.co",
    anonKey: "anon-public-test-key"
  })
}));

describe("appleStoreKitActions", () => {
  it("maps Apple ownership conflicts to safe account-conflict copy without success semantics", async () => {
    appleStoreKitMock.purchaseAppleStoreKitProduct.mockResolvedValueOnce({
      status: "accountConflict",
      clientMayFinishTransaction: false
    });

    const result = await startAppleStoreKitPurchase({
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: "billing-token" } },
            error: null
          })
        }
      } as never,
      signedIn: true,
      productId: "com.canyougeo.pro.monthly"
    });

    expect(result).toMatchObject({
      ok: false,
      status: "accountConflict",
      message: "This Apple subscription is linked to another Can You Geo account. Contact support."
    });
    expect(result.status).not.toBe("backendVerified");
    expect(result.nativeReviewEntitlement).toBeUndefined();
    expect(appleStoreKitMock.purchaseAppleStoreKitProduct).toHaveBeenCalledWith({
      supabaseUrl: "https://jquebthneczqdxagagof.supabase.co",
      anonKey: "anon-public-test-key",
      accessToken: "billing-token",
      productId: "com.canyougeo.pro.monthly"
    });
  });
});
