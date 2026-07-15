"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";
import {
  GUEST_ENTITLEMENT,
  fetchRemoteEntitlement,
  resolvePlayerEntitlement,
  type PlayerEntitlement
} from "@/lib/account/entitlements";
import { NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE } from "@/lib/mobile/nativeConnectivity";

export type EntitlementState = {
  entitlement: PlayerEntitlement;
  loading: boolean;
  error: string | null;
  configured: boolean;
  signedIn: boolean;
  refresh: () => Promise<void>;
};

export function useEntitlement(): EntitlementState {
  const account = useSupabaseAccount();
  const [entitlement, setEntitlement] = useState<PlayerEntitlement>(GUEST_ENTITLEMENT);
  const [loading, setLoading] = useState(account.loading);
  const [error, setError] = useState<string | null>(null);

  const loadEntitlement = useCallback(async () => {
    if (account.loading) {
      setLoading(true);
      return;
    }

    if (!account.client || !account.user) {
      setEntitlement(resolvePlayerEntitlement(null, false));
      setLoading(false);
      setError(null);
      return;
    }

    if (account.nativeOffline) {
      setEntitlement((currentEntitlement) =>
        currentEntitlement.plan === "guest" ? resolvePlayerEntitlement(null, true) : currentEntitlement
      );
      setLoading(false);
      setError(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE);
      return;
    }

    setLoading(true);
    const result = await fetchRemoteEntitlement(account.client, account.user.id);
    if (result.error) {
      setError(result.error);
      setEntitlement(resolvePlayerEntitlement(null, true));
    } else {
      setError(null);
      setEntitlement(resolvePlayerEntitlement(result.data, true));
    }
    setLoading(false);
  }, [account.client, account.loading, account.nativeOffline, account.user]);

  useEffect(() => {
    void loadEntitlement();
  }, [loadEntitlement]);

  return useMemo(
    () => ({
      entitlement,
      loading,
      error,
      configured: account.configured,
      signedIn: Boolean(account.user),
      refresh: loadEntitlement
    }),
    [account.configured, account.user, entitlement, error, loadEntitlement, loading]
  );
}
