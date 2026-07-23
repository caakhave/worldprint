import { describe, expect, it } from "vitest";
import { GooglePlayPublisherError } from "./googlePlayPublisher";
import { GooglePlayPurchaseError } from "./googlePlayPurchase";
import { buildGooglePlayVerifyDiagnostic, googlePlayVerifyClientError } from "./googlePlayVerifyDiagnostics";

describe("Google Play purchase verification diagnostics", () => {
  it.each([
    [401, "publisher_unauthenticated"],
    [403, "publisher_permission_denied"],
    [404, "purchase_not_found"]
  ])("preserves sanitized Google Publisher %i failures", (httpStatus, result) => {
    const diagnostic = buildGooglePlayVerifyDiagnostic(
      new GooglePlayPublisherError(result, false, httpStatus, {
        stage: "subscriptionsv2_get",
        googleApiError: {
          code: httpStatus,
          status: httpStatus === 404 ? "NOT_FOUND" : "PERMISSION_DENIED",
          message: "Google Play rejected the Android Publisher request for the app."
        }
      }),
      { productId: "canyougeo_pro", basePlanId: "monthly", purchaseStatePresent: true, acknowledgementStatePresent: true }
    );

    expect(diagnostic).toMatchObject({
      stage: "subscriptionsv2_get",
      result,
      status: httpStatus,
      retryable: false,
      productId: "canyougeo_pro",
      basePlanId: "monthly",
      purchaseStatePresent: true,
      acknowledgementStatePresent: true,
      googleApi: {
        code: httpStatus
      }
    });
    expect(googlePlayVerifyClientError(diagnostic)).toMatchObject({
      code: "google_play_subscription_lookup_failed",
      retryable: false
    });
  });

  it("classifies malformed service-account secrets before Google OAuth", () => {
    const diagnostic = buildGooglePlayVerifyDiagnostic(
      new GooglePlayPublisherError("invalid_service_account_json", false, null, { stage: "service_account_secret_loading" })
    );

    expect(diagnostic).toMatchObject({
      stage: "service_account_secret_loading",
      result: "invalid_service_account_json",
      status: 400,
      retryable: false
    });
    expect(googlePlayVerifyClientError(diagnostic).code).toBe("google_play_configuration_error");
  });

  it("distinguishes OAuth token creation from subscription lookup failures", () => {
    const diagnostic = buildGooglePlayVerifyDiagnostic(
      new GooglePlayPublisherError("token_exchange_failed", false, 400, {
        stage: "google_oauth_access_token",
        googleApiError: { code: 400, status: "invalid_grant", message: "Invalid JWT Signature." }
      })
    );

    expect(diagnostic).toMatchObject({
      stage: "google_oauth_access_token",
      result: "token_exchange_failed",
      httpStatus: 400,
      googleApi: {
        status: "invalid_grant",
        message: "Invalid JWT Signature."
      }
    });
    expect(googlePlayVerifyClientError(diagnostic).code).toBe("google_play_authorization_error");
  });

  it("classifies Google subscription response and base-plan mismatches", () => {
    expect(
      buildGooglePlayVerifyDiagnostic(new GooglePlayPurchaseError("unexpected_product_or_base_plan", false, 409), {
        productId: "canyougeo_pro",
        basePlanId: "monthly"
      })
    ).toMatchObject({
      stage: "product_base_plan_mapping",
      result: "unexpected_product_or_base_plan",
      productId: "canyougeo_pro",
      basePlanId: "monthly"
    });

    expect(buildGooglePlayVerifyDiagnostic(new GooglePlayPurchaseError("missing_period_end", false, 409))).toMatchObject({
      stage: "google_response_parsing_state_validation",
      result: "missing_period_end"
    });
  });

  it("keeps ownership conflicts and provider persistence failures separate", () => {
    expect(buildGooglePlayVerifyDiagnostic(new GooglePlayPurchaseError("ownership_conflict", false, 409))).toMatchObject({
      stage: "ownership_binding",
      result: "ownership_conflict",
      retryable: false
    });

    expect(
      buildGooglePlayVerifyDiagnostic(
        new GooglePlayPurchaseError("provider_subscription_persistence_failed", true, 500, {
          stage: "provider_subscription_persistence",
          rpcRow: {
            result: "provider_subscription_persistence_failed",
            provider_environment: "production",
            processed: false,
            provider_subscription_changed: false,
            compatibility_refreshed: false,
            reconciliation_required: true,
            retryable: true
          }
        })
      )
    ).toMatchObject({
      stage: "provider_subscription_persistence",
      rpcRow: {
        provider_subscription_changed: false,
        compatibility_refreshed: false
      }
    });
  });

  it("classifies entitlement and acknowledgement persistence failures", () => {
    expect(buildGooglePlayVerifyDiagnostic(new GooglePlayPurchaseError("entitlement_persistence_failed", true, 500))).toMatchObject({
      stage: "entitlement_persistence"
    });

    expect(buildGooglePlayVerifyDiagnostic(new GooglePlayPurchaseError("acknowledgement_record_failed", true, 500))).toMatchObject({
      stage: "purchase_acknowledgement"
    });
  });

  it("preserves sanitized Supabase/Postgres diagnostics without leaking secrets or purchase tokens", () => {
    const token = "purchase-token-that-must-not-appear-in-any-log-entry-123456789";
    const diagnostic = buildGooglePlayVerifyDiagnostic(
      new GooglePlayPurchaseError("rpc_failed", true, 500, {
        stage: "provider_subscription_persistence",
        supabaseError: {
          code: "23505",
          message: `duplicate key value violates unique constraint for ${token}`,
          details: `Key (purchase_token)=(${token}) already exists.`,
          hint: "Check the idempotency path."
        }
      })
    );
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic).toMatchObject({
      stage: "provider_subscription_persistence",
      supabase: {
        code: "23505"
      }
    });
    expect(serialized).not.toContain(token);
    expect(serialized).not.toMatch(/private_key|access_token|Bearer\s+[A-Za-z0-9]/i);
  });
});
