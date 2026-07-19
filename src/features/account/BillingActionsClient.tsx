"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  requestBillingActionUrl,
  NATIVE_CHECKOUT_UNAVAILABLE_MESSAGE,
  nativeBillingUnavailableMessage,
  type BillingActionKind,
  type BillingFunctionName,
  type BillingPendingState
} from "@/features/account/billingActionHelpers";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import type { PlayerEntitlement } from "@/lib/account/entitlements";
import { signUpPathForReturn } from "@/lib/account/signInRedirect";
import { publicBillingEnabled } from "@/lib/billing/publicBillingConfig";
import { PRO_PRICE_OPTIONS, type ProBillingInterval } from "@/lib/billing/proPricing";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import {
  addAppleStoreKitTransactionUpdatedListener,
  appleStoreKitProductIdForInterval,
  appleStoreKitIntervalForProductId,
  isIOSAppleStoreKitRuntime,
  queryAppleStoreKitProducts,
  type AppleStoreKitProductDetails,
  type AppleStoreKitProductId
} from "@/lib/mobile/appleStoreKit";
import {
  addGooglePlayPurchaseUpdatedListener,
  GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID,
  GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID,
  isAndroidGooglePlayBillingRuntime,
  launchGooglePlayPurchase,
  queryGooglePlayPlans,
  restoreGooglePlayPurchases,
  type GooglePlayBasePlanId,
  type GooglePlayPlanDetails,
  type GooglePlayPurchase
} from "@/lib/mobile/googlePlayBilling";
import {
  nativeStoreBillingBoundaryCopy,
  nativeStoreBillingPlatform,
  nativeStoreBillingSignInCopy,
  nativeStoreBillingUnavailableLabel
} from "@/lib/mobile/nativeStoreBillingPlatform";
import {
  finishAppleStoreKitAfterEntitlement,
  openAppleStoreKitSubscriptionManagement,
  restoreAppleStoreKitEntitlements,
  startAppleStoreKitPurchase,
  syncUnfinishedAppleStoreKitEntitlements,
  type AppleStoreKitActionResult
} from "@/features/account/appleStoreKitActions";
import { requestGooglePlayPurchaseContext, verifyGooglePlayPurchase } from "@/features/account/googlePlayPurchaseActions";
import { trackAnalyticsEvent, trackCheckoutStarted, trackUpgradeIntent } from "@/lib/site/analytics";

type BillingActionsClientProps = {
  entitlement: PlayerEntitlement;
  context: "upgrade" | "account";
  selectedPlan?: ProBillingInterval | null;
  checkoutLabel?: string;
  onVerified?: () => void | Promise<void>;
};

function signUpPathForPlan(interval: ProBillingInterval) {
  return signUpPathForReturn(`/upgrade?plan=${interval}`);
}

function analyticsPlanForInterval(interval: ProBillingInterval | undefined) {
  return interval === "yearly" ? "pro_yearly" : "pro_monthly";
}

function analyticsValueForInterval(interval: ProBillingInterval | undefined) {
  return interval === "yearly" ? 29.99 : 3.99;
}

function trackUpgradeNavigation(itemId: string) {
  trackAnalyticsEvent("cgy_select_content", {
    content_type: "upgrade_cta",
    item_id: itemId
  });
}

const GOOGLE_PLAY_PURCHASED_STATE = 1;
type NativeBillingRuntime = "google-play" | "apple" | "unavailable";
type NativePendingState = GooglePlayBasePlanId | AppleStoreKitProductId | "restore" | "manage" | null;

function detectNativeBillingRuntime(): NativeBillingRuntime {
  if (isAndroidGooglePlayBillingRuntime()) return "google-play";
  if (isIOSAppleStoreKitRuntime()) return "apple";
  return "unavailable";
}

function basePlanIdForInterval(interval: ProBillingInterval): GooglePlayBasePlanId {
  return interval === "yearly" ? GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID : GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID;
}

function intervalForBasePlanId(basePlanId: GooglePlayBasePlanId): ProBillingInterval {
  return basePlanId === GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID ? "yearly" : "monthly";
}

function googlePlayCatalogStatus(plans: GooglePlayPlanDetails[]) {
  const availableBasePlans = new Set(plans.map((plan) => plan.basePlanId));
  const hasMonthly = availableBasePlans.has(GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID);
  const hasAnnual = availableBasePlans.has(GOOGLE_PLAY_ANNUAL_BASE_PLAN_ID);
  if (hasMonthly && hasAnnual) return "";
  if (!hasMonthly && !hasAnnual) return "Google Play purchases are not available right now.";
  return "Some Google Play plans are not available right now.";
}

function appleStoreKitCatalogStatus(products: AppleStoreKitProductDetails[]) {
  const availableProducts = new Set(products.map((product) => product.productId));
  const hasMonthly = availableProducts.has(appleStoreKitProductIdForInterval("monthly"));
  const hasYearly = availableProducts.has(appleStoreKitProductIdForInterval("yearly"));
  if (hasMonthly && hasYearly) return "";
  if (!hasMonthly && !hasYearly) return "Apple purchases are not available right now.";
  return "Some Apple purchases are not available right now.";
}

export function BillingActionsClient({ entitlement, context, selectedPlan = null, checkoutLabel, onVerified }: BillingActionsClientProps) {
  const { client, configured, loading, user } = useSupabaseAccount();
  const [pending, setPending] = useState<BillingPendingState | null>(null);
  const [nativePending, setNativePending] = useState<NativePendingState>(null);
  const [nativeRuntime, setNativeRuntime] = useState<NativeBillingRuntime>(() => detectNativeBillingRuntime());
  const [nativePlans, setNativePlans] = useState<GooglePlayPlanDetails[]>([]);
  const [appleProducts, setAppleProducts] = useState<AppleStoreKitProductDetails[]>([]);
  const [nativePlansLoading, setNativePlansLoading] = useState(false);
  const [applePurchaseInSession, setApplePurchaseInSession] = useState(false);
  const [message, setMessage] = useState("");
  const signedIn = Boolean(user);
  const isPro = entitlement.plan === "pro";
  const hasStripeCustomer = Boolean(entitlement.row?.stripe_customer_id);
  const billingEnabled = configured && publicBillingEnabled();
  const nativeBuild = isNativeAppBuild();
  const nativePlatform =
    nativeRuntime === "google-play" ? "android" : nativeRuntime === "apple" ? "ios" : nativeStoreBillingPlatform(nativeBuild);

  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | null = null;

    async function loadNativeBilling() {
      if (!nativeBuild || isPro) return;
      const runtime = detectNativeBillingRuntime();
      if (!mounted) return;
      setNativeRuntime(runtime);
      if (runtime === "unavailable") return;

      if (!signedIn) {
        if (runtime === "apple") {
          const handle = await addAppleStoreKitTransactionUpdatedListener(() => {
            if (mounted) setMessage("Sign in to restore purchase.");
          });
          if (!mounted) {
            await handle.remove();
            return;
          }
          removeListener = () => void handle.remove();
        }
        return;
      }

      setNativePlansLoading(true);
      try {
        if (runtime === "google-play") {
          const [plans, handle] = await Promise.all([
            queryGooglePlayPlans(),
            addGooglePlayPurchaseUpdatedListener((purchases) => void verifyNativePurchases(purchases, null))
          ]);
          if (!mounted) {
            await handle.remove();
            return;
          }
          removeListener = () => void handle.remove();
          setNativePlans(plans);
          setMessage(googlePlayCatalogStatus(plans));
          void restoreNativePurchases({ quiet: true });
        } else {
          const [products, handle] = await Promise.all([
            queryAppleStoreKitProducts(),
            addAppleStoreKitTransactionUpdatedListener(() => void syncAppleStoreKitTransactions({ quiet: true }))
          ]);
          if (!mounted) {
            await handle.remove();
            return;
          }
          removeListener = () => void handle.remove();
          setAppleProducts(products);
          setMessage(appleStoreKitCatalogStatus(products));
          void syncAppleStoreKitTransactions({ quiet: true });
        }
      } catch {
        if (mounted) {
          setMessage(runtime === "apple" ? "Apple purchases are not available right now." : "Google Play purchases are not available right now.");
        }
      } finally {
        if (mounted) setNativePlansLoading(false);
      }
    }

    void loadNativeBilling();
    return () => {
      mounted = false;
      removeListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isPro, nativeBuild, signedIn]);

  function trackUpgradeClick(interval: ProBillingInterval | undefined) {
    trackUpgradeIntent({
      currency: "USD",
      value: analyticsValueForInterval(interval),
      plan: analyticsPlanForInterval(interval),
      signed_in: signedIn,
      source: context
    });
  }

  async function invokeBillingFunction(
    functionName: BillingFunctionName,
    pendingState: BillingPendingState,
    kind: BillingActionKind,
    interval?: ProBillingInterval
  ) {
    if (nativeBuild) {
      setMessage(nativeBillingUnavailableMessage(kind));
      return;
    }

    setPending(pendingState);
    setMessage("");
    if (kind === "checkout") {
      trackUpgradeClick(interval);
    }
    const result = await requestBillingActionUrl({
      client,
      signedIn,
      functionName,
      kind,
      interval
    });
    setPending(null);
    if (result.message || !result.url) {
      setMessage(result.message ?? (kind === "portal" ? "Billing management could not open. Please try again." : "Checkout could not start. Please try again."));
      return;
    }
    if (kind === "checkout") {
      trackCheckoutStarted({
        currency: "USD",
        value: analyticsValueForInterval(interval),
        plan: analyticsPlanForInterval(interval)
      });
    }
    window.location.assign(result.url);
  }

  async function verifyNativePurchases(purchases: GooglePlayPurchase[], basePlanId: GooglePlayBasePlanId | null) {
    const purchased = purchases.filter((purchase) => purchase.purchaseState === GOOGLE_PLAY_PURCHASED_STATE);
    if (purchased.length === 0) return;
    for (const purchase of purchased) {
      const result = await verifyGooglePlayPurchase({
        client,
        signedIn,
        purchase,
        basePlanId
      });
      if (!result.ok) {
        setMessage(result.message ?? "Google Play purchase could not be verified.");
        return;
      }
    }
    setMessage("Google Play purchase verified. Pro access will refresh shortly.");
    await onVerified?.();
  }

  async function startGooglePlayPurchase(basePlanId: GooglePlayBasePlanId) {
    setNativePending(basePlanId);
    setMessage("");
    trackUpgradeClick(intervalForBasePlanId(basePlanId));
    const contextResult = await requestGooglePlayPurchaseContext({ client, signedIn });
    if (!contextResult.obfuscatedAccountId) {
      setNativePending(null);
      setMessage(contextResult.message ?? "Google Play purchases could not start.");
      return;
    }
    try {
      await launchGooglePlayPurchase({ basePlanId, obfuscatedAccountId: contextResult.obfuscatedAccountId });
      setMessage("Complete the purchase in Google Play.");
    } catch {
      setMessage("Google Play purchase could not start. Try again in a minute.");
    } finally {
      setNativePending(null);
    }
  }

  async function restoreNativePurchases(options: { quiet?: boolean } = {}) {
    setNativePending("restore");
    if (!options.quiet) setMessage("");
    try {
      const purchases = await restoreGooglePlayPurchases();
      await verifyNativePurchases(purchases, null);
      if (!options.quiet && purchases.length === 0) {
        setMessage("No active Google Play purchases were found for this account.");
      }
    } catch {
      if (!options.quiet) setMessage("Google Play purchases could not be restored right now.");
    } finally {
      setNativePending(null);
    }
  }

  async function completeAppleStoreKitVerification(result: AppleStoreKitActionResult, options: { quiet?: boolean } = {}) {
    if (!result.ok || result.status !== "backendVerified") {
      if (!options.quiet && result.message) setMessage(result.message);
      return;
    }
    const finishResult = await finishAppleStoreKitAfterEntitlement({ client, userId: user?.id });
    await onVerified?.();
    if (finishResult.ok) {
      setApplePurchaseInSession(true);
    }
    if (!options.quiet) {
      setMessage(finishResult.message ?? result.message ?? "Apple purchase verified. Pro access will refresh shortly.");
    }
  }

  async function startApplePurchase(productId: AppleStoreKitProductId) {
    setNativePending(productId);
    setMessage("");
    trackUpgradeClick(appleStoreKitIntervalForProductId(productId));
    try {
      const result = await startAppleStoreKitPurchase({ client, signedIn, productId });
      if (result.status === "backendVerified") {
        await completeAppleStoreKitVerification(result);
      } else {
        setMessage(result.message ?? "Apple purchase could not be completed. Try again in a minute.");
      }
    } catch {
      setMessage("Apple purchase could not start. Try again in a minute.");
    } finally {
      setNativePending(null);
    }
  }

  async function restoreApplePurchases(options: { quiet?: boolean } = {}) {
    setNativePending("restore");
    if (!options.quiet) setMessage("");
    try {
      const result = await restoreAppleStoreKitEntitlements({ client, signedIn });
      if (result.status === "backendVerified") {
        await completeAppleStoreKitVerification(result, options);
      } else if (!options.quiet && result.message) {
        setMessage(result.message);
      }
    } catch {
      if (!options.quiet) setMessage("Apple purchases could not be restored right now.");
    } finally {
      setNativePending(null);
    }
  }

  async function syncAppleStoreKitTransactions(options: { quiet?: boolean } = {}) {
    if (!signedIn) {
      if (!options.quiet) setMessage("Sign in to restore purchase.");
      return;
    }
    try {
      const result = await syncUnfinishedAppleStoreKitEntitlements({ client, signedIn });
      if (result.status === "backendVerified") {
        await completeAppleStoreKitVerification(result, options);
      } else if (!options.quiet && result.message) {
        setMessage(result.message);
      }
    } catch {
      if (!options.quiet) setMessage("Apple purchases could not be refreshed right now.");
    }
  }

  async function openAppleSubscriptionManagement() {
    setNativePending("manage");
    setMessage("");
    try {
      const result = await openAppleStoreKitSubscriptionManagement();
      if (!result.ok && result.message) setMessage(result.message);
    } catch {
      setMessage("Apple subscription management could not open right now.");
    } finally {
      setNativePending(null);
    }
  }

  if (nativeBuild) {
    if (isPro) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          {context === "upgrade" ? (
            <Link className="button" href="/account">
              View account
            </Link>
          ) : (
            <button className="button" type="button" disabled>
              Membership active
            </button>
          )}
          {context === "account" ? (
            <Link className="button-secondary" href="/upgrade">
              View plan
            </Link>
          ) : null}
          {nativeRuntime === "apple" && applePurchaseInSession ? (
            <button className="button-secondary" type="button" onClick={() => void openAppleSubscriptionManagement()} disabled={nativePending !== null}>
              {nativePending === "manage" ? "Opening Apple..." : "Manage Apple subscription"}
            </button>
          ) : null}
          <p className="account-env-note">
            Existing Pro access remains available on this account. Manage the subscription through the store or website where it was created.
          </p>
          {message ? (
            <p className="account-error" role="alert">
              {message}
            </p>
          ) : null}
        </div>
      );
    }

    if (!signedIn) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          <Link className="button" href={signUpPathForReturn("/upgrade")} onClick={() => trackUpgradeNavigation(`${context}_start_pro_native_${nativePlatform}`)}>
            Start Pro
          </Link>
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
          <p className="account-env-note">{nativeStoreBillingSignInCopy(nativePlatform)}</p>
          {message ? (
            <p className="account-error" role="alert">
              {message}
            </p>
          ) : null}
        </div>
      );
    }

    if (nativeRuntime === "google-play") {
      const visibleOptions = selectedPlan ? PRO_PRICE_OPTIONS.filter((option) => option.interval === selectedPlan) : PRO_PRICE_OPTIONS;
      return (
        <div className={selectedPlan ? "billing-actions billing-actions-focused" : "billing-actions"} aria-label="Billing actions">
          <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence">
            {visibleOptions.map((option) => {
              const basePlanId = basePlanIdForInterval(option.interval);
              const nativePlan = nativePlans.find((plan) => plan.basePlanId === basePlanId);
              const label = checkoutLabel ?? option.cta;
              return (
                <button
                  className={option.featured ? "button" : "button-secondary"}
                  type="button"
                  key={option.interval}
                  onClick={() => void startGooglePlayPurchase(basePlanId)}
                  disabled={nativePending !== null || nativePlansLoading || !nativePlan}
                >
                  <span>{nativePending === basePlanId ? "Opening Google Play..." : label}</span>
                  {nativePlan?.localizedPrice ? <span className="checkout-button-badge">{nativePlan.localizedPrice}</span> : null}
                </button>
              );
            })}
          </div>
          <button className="button-secondary" type="button" onClick={() => void restoreNativePurchases()} disabled={nativePending !== null}>
            {nativePending === "restore" ? "Checking Google Play..." : "Restore purchases"}
          </button>
          {context === "account" ? (
            <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans_native_google_play")}>
              Compare plans
            </Link>
          ) : null}
          {message ? (
            <p className={message.includes("verified") ? "account-env-note" : "account-error"} role={message.includes("verified") ? "status" : "alert"}>
              {message}
            </p>
          ) : null}
          <p className="account-env-note">
            {nativeStoreBillingBoundaryCopy(nativePlatform)}
          </p>
        </div>
      );
    }

    if (nativeRuntime === "apple") {
      const visibleOptions = selectedPlan ? PRO_PRICE_OPTIONS.filter((option) => option.interval === selectedPlan) : PRO_PRICE_OPTIONS;
      return (
        <div className={selectedPlan ? "billing-actions billing-actions-focused" : "billing-actions"} aria-label="Billing actions">
          <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence">
            {visibleOptions.map((option) => {
              const productId = appleStoreKitProductIdForInterval(option.interval);
              const appleProduct = appleProducts.find((product) => product.productId === productId);
              const label = checkoutLabel ?? option.cta;
              return (
                <button
                  className={option.featured ? "button" : "button-secondary"}
                  type="button"
                  key={option.interval}
                  onClick={() => void startApplePurchase(productId)}
                  disabled={nativePending !== null || nativePlansLoading || !appleProduct}
                >
                  <span>{nativePending === productId ? "Opening Apple..." : label}</span>
                  {appleProduct?.displayPrice ? <span className="checkout-button-badge">{appleProduct.displayPrice}</span> : null}
                </button>
              );
            })}
          </div>
          <button className="button-secondary" type="button" onClick={() => void restoreApplePurchases()} disabled={nativePending !== null}>
            {nativePending === "restore" ? "Checking Apple..." : "Restore purchases"}
          </button>
          {applePurchaseInSession ? (
            <button className="button-secondary" type="button" onClick={() => void openAppleSubscriptionManagement()} disabled={nativePending !== null}>
              {nativePending === "manage" ? "Opening Apple..." : "Manage Apple subscription"}
            </button>
          ) : null}
          {context === "account" ? (
            <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans_native_apple")}>
              Compare plans
            </Link>
          ) : null}
          {message ? (
            <p className={message.includes("verified") || message.includes("active") ? "account-env-note" : "account-error"} role={message.includes("verified") || message.includes("active") ? "status" : "alert"}>
              {message}
            </p>
          ) : null}
          <p className="account-env-note">
            {nativeStoreBillingBoundaryCopy(nativePlatform)}
          </p>
        </div>
      );
    }

    return (
      <div className="billing-actions" aria-label="Billing actions">
        <button className="button" type="button" disabled>
          {nativeStoreBillingUnavailableLabel(nativePlatform)}
        </button>
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans_native_preview")}>
            Compare plans
          </Link>
        ) : signedIn ? (
          <Link className="button-secondary" href="/account">
            Continue free
          </Link>
        ) : (
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
        )}
        <p className="account-env-note">
          {NATIVE_CHECKOUT_UNAVAILABLE_MESSAGE} Free play and already entitled Pro access still work.
        </p>
      </div>
    );
  }

  if (!billingEnabled) {
    if (!signedIn) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          <Link
            className="button"
            href={signUpPathForReturn("/upgrade")}
            onClick={() => trackUpgradeNavigation(`${context}_start_pro`)}
          >
            Start Pro
          </Link>
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
          <p className="account-env-note">
            Create or sign in to your free account anytime. Pro unlocks the full Can You Geo library where supported.
          </p>
        </div>
      );
    }

    if (isPro) {
      return (
        <div className="billing-actions" aria-label="Billing actions">
          {context === "upgrade" ? (
            <Link className="button" href="/account">
              Manage from account
            </Link>
          ) : (
            <button className="button" type="button" disabled>
              Membership active
            </button>
          )}
          {context === "account" ? (
            <Link className="button-secondary" href="/upgrade">
              Manage plan
            </Link>
          ) : null}
          <p className="account-env-note">
            {hasStripeCustomer
              ? "Can You Geo? Pro membership is enabled. Manage membership details from your account."
              : "Can You Geo? Pro membership is enabled on this account."}
          </p>
        </div>
      );
    }

    return (
      <div className="billing-actions" aria-label="Billing actions">
        <button className="button" type="button" disabled>
          Checkout setup needed
        </button>
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans_billing_setup")}>
            Compare plans
          </Link>
        ) : null}
        <p className="account-env-note">
          Secure checkout needs billing setup in this environment. Continue free for Daily rounds in Daily-enabled games.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="billing-actions" aria-label="Billing actions">
        <button className="button" type="button" disabled>
          Checking account
        </button>
      </div>
    );
  }

  if (!signedIn) {
    const signInOptions = selectedPlan ? PRO_PRICE_OPTIONS.filter((option) => option.interval === selectedPlan) : PRO_PRICE_OPTIONS;
    return (
      <div className="billing-actions" aria-label="Billing actions">
        <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence before sign-in">
          {signInOptions.map((option) => (
            <Link
              className={option.featured ? "button" : "button-secondary"}
              href={signUpPathForPlan(option.interval)}
              key={option.interval}
              onClick={() => {
                trackUpgradeClick(option.interval);
                trackAnalyticsEvent("cgy_select_content", {
                  content_type: "pro_plan",
                  item_id: analyticsPlanForInterval(option.interval)
                });
              }}
            >
              <span>{checkoutLabel ?? option.cta}</span>
              {option.badge ? (
                <span className="checkout-button-badge" aria-hidden="true">
                  {option.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
        <Link className="button-secondary" href="/sign-up">
          Continue free
        </Link>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="billing-actions" aria-label="Billing actions">
        {hasStripeCustomer ? (
          <button
            className="button"
            type="button"
            onClick={() => void invokeBillingFunction("stripe-portal", "portal", "portal")}
            disabled={pending !== null}
          >
            {pending === "portal" ? "Opening billing..." : "Manage billing"}
          </button>
        ) : (
          <button className="button" type="button" disabled>
            You have Pro
          </button>
        )}
        {context === "account" ? (
          <Link className="button-secondary" href="/upgrade">
            Manage plan
          </Link>
        ) : null}
        {message ? (
          <p className="account-error" role="alert">
            {message}
          </p>
        ) : null}
        {!hasStripeCustomer ? <p className="account-env-note">This account has Pro. Manage membership details from your account.</p> : null}
      </div>
    );
  }

  if (selectedPlan) {
    const selectedOption = PRO_PRICE_OPTIONS.find((option) => option.interval === selectedPlan) ?? PRO_PRICE_OPTIONS[0];
    const pendingKey = `checkout-${selectedOption.interval}` as const;
    return (
      <div className="billing-actions billing-actions-focused" aria-label="Billing actions">
        <button
          className="button"
          type="button"
          onClick={() => void invokeBillingFunction("stripe-checkout", pendingKey, "checkout", selectedOption.interval)}
          disabled={pending !== null}
        >
          <span>{pending === pendingKey ? "Opening secure checkout..." : checkoutLabel ?? selectedOption.cta}</span>
          {selectedOption.badge ? (
            <span className="checkout-button-badge" aria-hidden="true">
              {selectedOption.badge}
            </span>
          ) : null}
        </button>
        {message ? (
          <p className="account-error" role="alert">
            {message}
          </p>
        ) : null}
        <p className="account-env-note">Stripe handles checkout securely.</p>
      </div>
    );
  }

  return (
    <div className="billing-actions" aria-label="Billing actions">
      <div className="checkout-option-buttons" aria-label="Choose Pro billing cadence">
        {PRO_PRICE_OPTIONS.map((option) => {
          const pendingKey = `checkout-${option.interval}` as const;
          return (
            <button
              className={option.featured ? "button" : "button-secondary"}
              type="button"
              key={option.interval}
              onClick={() => void invokeBillingFunction("stripe-checkout", pendingKey, "checkout", option.interval)}
              disabled={pending !== null}
            >
              <span>{pending === pendingKey ? "Opening secure checkout..." : option.cta}</span>
              {option.badge ? (
                <span className="checkout-button-badge" aria-hidden="true">
                  {option.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {context === "account" ? (
        <Link className="button-secondary" href="/upgrade" onClick={() => trackUpgradeNavigation("account_compare_plans")}>
          Compare plans
        </Link>
      ) : null}
      {message ? (
        <p className="account-error" role="alert">
          {message}
        </p>
      ) : null}
      <p className="account-env-note">Stripe handles checkout securely.</p>
    </div>
  );
}
