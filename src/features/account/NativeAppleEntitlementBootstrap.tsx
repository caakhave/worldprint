"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  finishAppleStoreKitAfterEntitlement,
  syncUnfinishedAppleStoreKitEntitlements
} from "@/features/account/appleStoreKitActions";
import { clearNativeAppleReviewEntitlement } from "@/features/account/nativeAppleReviewEntitlement";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import { notifyEntitlementChanged } from "@/features/account/entitlementInvalidation";
import { isIOSAppleStoreKitRuntime } from "@/lib/mobile/appleStoreKit";

const completedNativeAppleBootstrapSyncKeys = new Set<string>();
const inFlightNativeAppleBootstrapSyncKeys = new Set<string>();

type NativeAppleBootstrapDecision = {
  shouldRun: boolean;
  reason:
    | "ios_storekit_signed_in"
    | "non_ios_storekit_runtime"
    | "account_loading"
    | "signed_out"
    | "native_offline"
    | "missing_client"
    | "already_synced"
    | "sync_in_flight";
};

export function nativeAppleEntitlementBootstrapDecision(input: {
  iosStoreKitRuntime: boolean;
  accountLoading: boolean;
  signedIn: boolean;
  nativeOffline: boolean;
  hasClient: boolean;
  syncKey: string | null;
}): NativeAppleBootstrapDecision {
  if (!input.iosStoreKitRuntime) return { shouldRun: false, reason: "non_ios_storekit_runtime" };
  if (input.accountLoading) return { shouldRun: false, reason: "account_loading" };
  if (!input.signedIn) return { shouldRun: false, reason: "signed_out" };
  if (input.nativeOffline) return { shouldRun: false, reason: "native_offline" };
  if (!input.hasClient) return { shouldRun: false, reason: "missing_client" };
  if (!input.syncKey) return { shouldRun: false, reason: "signed_out" };
  if (completedNativeAppleBootstrapSyncKeys.has(input.syncKey)) return { shouldRun: false, reason: "already_synced" };
  if (inFlightNativeAppleBootstrapSyncKeys.has(input.syncKey)) return { shouldRun: false, reason: "sync_in_flight" };
  return { shouldRun: true, reason: "ios_storekit_signed_in" };
}

export function nativeAppleEntitlementBootstrapSyncKey(userId: string | null | undefined, sessionExpiresAt: number | null | undefined) {
  if (!userId) return null;
  return `${userId}:${sessionExpiresAt ?? "session"}`;
}

export function resetNativeAppleEntitlementBootstrapForTests() {
  completedNativeAppleBootstrapSyncKeys.clear();
  inFlightNativeAppleBootstrapSyncKeys.clear();
}

export function NativeAppleEntitlementBootstrap() {
  const account = useSupabaseAccount();
  const iosStoreKitRuntime = useMemo(() => isIOSAppleStoreKitRuntime(), []);
  const syncKey = nativeAppleEntitlementBootstrapSyncKey(account.user?.id, account.session?.expires_at);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = account.user?.id ?? null;
    if (lastUserIdRef.current && lastUserIdRef.current !== currentUserId) {
      if (clearNativeAppleReviewEntitlement()) notifyEntitlementChanged();
    }
    lastUserIdRef.current = currentUserId;
  }, [account.user?.id]);

  useEffect(() => {
    if (!iosStoreKitRuntime || account.loading) return;
    if (!account.user) {
      if (clearNativeAppleReviewEntitlement()) notifyEntitlementChanged();
    }
  }, [account.loading, account.user, iosStoreKitRuntime]);

  useEffect(() => {
    const decision = nativeAppleEntitlementBootstrapDecision({
      iosStoreKitRuntime,
      accountLoading: account.loading,
      signedIn: Boolean(account.user),
      nativeOffline: account.nativeOffline,
      hasClient: Boolean(account.client),
      syncKey
    });

    if (!decision.shouldRun || !syncKey) return undefined;

    let cancelled = false;
    inFlightNativeAppleBootstrapSyncKeys.add(syncKey);

    async function syncNativeAppleEntitlement() {
      const result = await syncUnfinishedAppleStoreKitEntitlements({
        client: account.client,
        signedIn: Boolean(account.user)
      });

      if (cancelled) return;

      if (result.ok && result.status === "backendVerified") {
        const finishResult = await finishAppleStoreKitAfterEntitlement({
          client: account.client,
          userId: account.user?.id,
          nativeReviewEntitlement: result.nativeReviewEntitlement
        });
        if (cancelled) return;
        if (finishResult.ok) {
          notifyEntitlementChanged();
        } else if (!result.nativeReviewEntitlement && clearNativeAppleReviewEntitlement()) {
          notifyEntitlementChanged();
        }
        return;
      }

      if (result.ok && result.status === "none" && clearNativeAppleReviewEntitlement()) {
        notifyEntitlementChanged();
      }
    }

    void syncNativeAppleEntitlement()
      .catch(() => {
        // Quiet cold-start recovery must never block the app shell.
      })
      .finally(() => {
        inFlightNativeAppleBootstrapSyncKeys.delete(syncKey);
        completedNativeAppleBootstrapSyncKeys.add(syncKey);
      });

    return () => {
      cancelled = true;
    };
  }, [account.client, account.loading, account.nativeOffline, account.user, iosStoreKitRuntime, syncKey]);

  return null;
}
