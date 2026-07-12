"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountInitial, compactPlanLabel } from "@/features/account/accountDisplay";
import { membershipDisplay } from "@/features/account/subscriptionDisplay";
import { useEntitlement } from "@/features/account/useEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { fetchMarketingPreference, statsSyncSignature, syncMarkerKey, updateMarketingPreference, type MarketingPreference } from "@/lib/account/sync";
import { planLabel } from "@/lib/account/entitlements";
import { CONTACT_LINKS } from "@/lib/contact";
import { buildLocalPlayerStats } from "@/lib/persistence/playerStats";
import { loadPersistedState } from "@/lib/persistence/storage";
import { trackAnalyticsEvent } from "@/lib/site/analytics";

function trackUpgradeNavigation(itemId: string) {
  trackAnalyticsEvent("cgy_select_content", {
    content_type: "upgrade_cta",
    item_id: itemId
  });
}

export function AccountStatusClient() {
  const router = useRouter();
  const { client, configured, loading, user, profileError, signOut } = useSupabaseAccount();
  const { entitlement, loading: entitlementLoading } = useEntitlement();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [supportIdVisible, setSupportIdVisible] = useState(false);
  const [supportIdStatus, setSupportIdStatus] = useState("");
  const [marketingPreference, setMarketingPreference] = useState<MarketingPreference | null>(null);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingStatus, setMarketingStatus] = useState("");
  const [marketingError, setMarketingError] = useState("");
  const [hasImportableLocalRuns, setHasImportableLocalRuns] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!client || !user) {
      setMarketingPreference(null);
      setMarketingLoading(false);
      return;
    }
    setMarketingLoading(true);
    setMarketingError("");
    void fetchMarketingPreference(client, user.id).then((result) => {
      if (cancelled) return;
      setMarketingPreference(result.data);
      setMarketingError(result.error ? "We could not load your email update preference." : "");
      setMarketingLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [client, user]);

  useEffect(() => {
    if (!user) {
      setHasImportableLocalRuns(false);
      return;
    }
    try {
      const store = loadPersistedState();
      const localStats = buildLocalPlayerStats(store);
      const signature = statsSyncSignature(store);
      const importedSignature = window.localStorage.getItem(syncMarkerKey(user.id));
      setHasImportableLocalRuns(localStats.gamesCompleted > 0 && importedSignature !== signature);
    } catch {
      setHasImportableLocalRuns(false);
    }
  }, [user]);

  async function handleSignOut() {
    const result = await signOut();
    if (result.error) {
      setSignOutError("We could not sign you out. Try again in a moment.");
      return;
    }
    setSignOutError(null);
    router.push("/sign-in?signedOut=1");
  }

  async function copySupportId() {
    if (!user) return;
    try {
      await navigator.clipboard?.writeText(user.id);
      setSupportIdStatus("Support ID copied.");
    } catch {
      setSupportIdStatus("Copy did not work. You can select the ID instead.");
    }
  }

  async function handleMarketingPreference(nextOptIn: boolean) {
    if (!client || !user) return;
    setMarketingSaving(true);
    setMarketingError("");
    setMarketingStatus("");
    const result = await updateMarketingPreference(client, user.id, nextOptIn);
    if (result.error) {
      setMarketingError("We could not update your email preference. Try again in a moment.");
      setMarketingSaving(false);
      return;
    }
    const refreshed = await fetchMarketingPreference(client, user.id);
    setMarketingPreference(refreshed.data);
    setMarketingError(refreshed.error ? "Preference saved, but we could not refresh it yet." : "");
    setMarketingStatus(nextOptIn ? "Email updates turned on." : "Email updates turned off.");
    setMarketingSaving(false);
  }

  if (!configured) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Account status</p>
        <h2>Account sign-in is unavailable in this preview.</h2>
        <p>Sample runs are available in this browser. Daily games and saved progress start with a free account where supported.</p>
        <Link className="button-secondary" href="/play">
          Explore games
        </Link>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Account status</p>
        <h2>Checking whether you&apos;re signed in.</h2>
        <p>Looking for a saved account on this device.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="surface account-card account-primary-card">
        <p className="eyebrow">Signed out</p>
        <h2>Start Pro or continue free.</h2>
        <p>
          Create a free account or sign in to save Daily progress where supported. Pro unlocks supported custom runs and the full
          Mystery Map archive.
        </p>
        <div className="button-row">
          <Link className="button" href="/upgrade" onClick={() => trackUpgradeNavigation("account_status_signed_out_start_pro")}>
            Start Pro
          </Link>
          <Link className="button-secondary" href="/sign-up">
            Continue free
          </Link>
        </div>
      </article>
    );
  }

  const membershipLabel = entitlementLoading ? "Checking" : planLabel(entitlement.plan);
  const compactMembershipLabel = entitlementLoading ? "Account" : compactPlanLabel(entitlement.plan);
  const membership = membershipDisplay(entitlement, entitlementLoading);
  const planActionLabel = entitlement.plan === "pro" ? "Manage plan" : "Compare plans";
  const updatesEnabled = marketingPreference?.marketing_opt_in === true;

  return (
    <article className="surface account-card account-primary-card account-summary-card">
      <div className="account-identity">
        <span className="account-avatar account-avatar-large" aria-hidden="true">
          {accountInitial(user.email)}
        </span>
        <div className="account-identity-copy">
          <p className="eyebrow">Player profile</p>
          <h2 className="account-identity-email">{user.email ?? "Signed-in player"}</h2>
          <div className="account-identity-badges" aria-label="Account status">
            <span className="account-plan-badge" data-plan={entitlementLoading ? "loading" : entitlement.plan}>
              {compactMembershipLabel}
            </span>
            <span>{membership.heading}</span>
          </div>
        </div>
      </div>
      <div className="account-summary-head">
        <p>Profile connected. Your scores, saved runs, and plan controls are ready.</p>
      </div>
      <dl className="account-status-list account-mini-status account-summary-list">
        <div>
          <dt>Membership</dt>
          <dd>
            {membershipLabel}
            <span>{membership.detail}</span>
          </dd>
        </div>
        {hasImportableLocalRuns ? (
          <div>
            <dt>Import guest plays</dt>
            <dd>
              Move guest plays into this account.
              <span>If you played sample or guest maps in this browser before signing in, you can import those local results here.</span>
              <Link className="account-inline-action" href="/account/stats#saved-stats">
                Import guest plays
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="account-support-tools">
        <section className="account-preference-panel" aria-labelledby="marketing-preference-title">
          <div>
            <p className="eyebrow">Email updates</p>
            <h3 id="marketing-preference-title">Game updates</h3>
            <p>
              {marketingLoading
                ? "Checking your update preference."
                : updatesEnabled
                  ? "Updates are on. You may receive occasional Can You Geo updates and new game announcements."
                  : "Updates are off. Account, billing, password reset, and security emails still work."}
            </p>
          </div>
          <button
            className="button-subtle"
            type="button"
            disabled={marketingLoading || marketingSaving}
            onClick={() => void handleMarketingPreference(!marketingPreference?.marketing_opt_in)}
          >
            {marketingSaving
              ? "Saving..."
              : updatesEnabled
                ? "Turn off updates"
                : "Turn on updates"}
          </button>
          {marketingStatus ? (
            <p className="status-live" role="status">
              {marketingStatus}
            </p>
          ) : null}
          {marketingError ? (
            <p className="account-error" role="alert">
              {marketingError}
            </p>
          ) : null}
        </section>
        <a className="button-subtle" href={CONTACT_LINKS.accountHelp.href}>
          Email support
        </a>
        <button className="button-subtle" type="button" onClick={() => setSupportIdVisible((visible) => !visible)}>
          {supportIdVisible ? "Hide support ID" : "Show support ID"}
        </button>
        {supportIdVisible ? (
          <div className="account-support-id" role="group" aria-label="Support ID">
            <p>Use this only if support asks for it.</p>
            <code>{user.id}</code>
            <button className="button-subtle" type="button" onClick={() => void copySupportId()}>
              Copy support ID
            </button>
          </div>
        ) : null}
        {supportIdStatus ? (
          <p className="status-live" role="status">
            {supportIdStatus}
          </p>
        ) : null}
      </div>
      {profileError ? <p className="account-error">We could not refresh your account details. You can keep playing.</p> : null}
      {signOutError ? (
        <p className="account-error" role="alert">
          {signOutError}
        </p>
      ) : null}
      <div className="button-row">
        <Link className="button" href="/account/stats#saved-stats">
          View saved stats
        </Link>
        <Link
          className="button-secondary"
          href="/upgrade"
          onClick={() => {
            if (entitlement.plan !== "pro") trackUpgradeNavigation("account_status_compare_plans");
          }}
        >
          {planActionLabel}
        </Link>
        <button className="button-secondary" type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </div>
    </article>
  );
}
