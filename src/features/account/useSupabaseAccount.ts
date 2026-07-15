"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureProfile } from "@/lib/account/sync";
import {
  browserReportsOnline,
  isNativeAppCurrentlyOfflineAsync,
  NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE,
  shouldUseNativeConnectivityGuard
} from "@/lib/mobile/nativeConnectivity";
import { createSupabaseBrowserClient, type CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import { missingSupabasePublicEnv } from "@/lib/supabase/env";

const ACCOUNT_SESSION_REFRESH_ERROR_MESSAGE = "We could not refresh your account session. Try again in a moment.";

export type SupabaseAccountState = {
  client: CanYouGeoSupabaseClient | null;
  configured: boolean;
  missingEnv: string[];
  loading: boolean;
  session: Session | null;
  user: User | null;
  profileError: string | null;
  nativeOffline: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<{ error: string | null }>;
};

export function useSupabaseAccount(): SupabaseAccountState {
  const missingEnv = useMemo(() => missingSupabasePublicEnv(), []);
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const configured = Boolean(client);
  const nativeConnectivityGuard = useMemo(() => shouldUseNativeConnectivityGuard(), []);
  const [online, setOnline] = useState(() => !nativeConnectivityGuard || browserReportsOnline());
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const lastNativeOfflineRef = useRef(nativeConnectivityGuard && !browserReportsOnline());
  const nativeOffline = nativeConnectivityGuard && !online;

  const loadSession = useCallback(async () => {
    if (!client) {
      setLoading(false);
      setSession(null);
      return;
    }
    setLoading(true);
    const offlineNow = await isNativeAppCurrentlyOfflineAsync();
    if (nativeConnectivityGuard) setOnline(!offlineNow);
    const { data, error } = await client.auth.getSession();
    if (error) {
      setProfileError(offlineNow ? NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE : ACCOUNT_SESSION_REFRESH_ERROR_MESSAGE);
      if (!offlineNow) setSession(null);
      setLoading(false);
      return;
    }
    setSession(data.session);
    if (data.session?.user) {
      if (offlineNow) {
        setProfileError(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE);
      } else {
        const profile = await ensureProfile(client, data.session.user);
        setProfileError(profile.error);
      }
    } else {
      setProfileError(null);
    }
    setLoading(false);
  }, [client, nativeConnectivityGuard]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!nativeConnectivityGuard) return undefined;
    let cancelled = false;
    const refreshOnlineStatus = () => {
      if (!browserReportsOnline()) {
        lastNativeOfflineRef.current = true;
        setOnline(false);
        return;
      }
      void isNativeAppCurrentlyOfflineAsync().then((offline) => {
        if (cancelled) return;
        const wasOffline = lastNativeOfflineRef.current;
        lastNativeOfflineRef.current = offline;
        setOnline(!offline);
        if (wasOffline && !offline) void loadSession();
      });
    };
    refreshOnlineStatus();
    window.addEventListener("online", refreshOnlineStatus);
    window.addEventListener("offline", refreshOnlineStatus);
    return () => {
      cancelled = true;
      window.removeEventListener("online", refreshOnlineStatus);
      window.removeEventListener("offline", refreshOnlineStatus);
    };
  }, [loadSession, nativeConnectivityGuard]);

  useEffect(() => {
    if (!client) return undefined;
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        if (nativeOffline) {
          setProfileError(NATIVE_ACCOUNT_SYNC_DEFERRED_MESSAGE);
        } else {
          void ensureProfile(client, nextSession.user).then((result) => setProfileError(result.error));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [client, nativeOffline]);

  const signOut = useCallback(async () => {
    if (!client) return { error: "Supabase is not configured." };
    const { error } = await client.auth.signOut();
    if (!error) setSession(null);
    return { error: error?.message ?? null };
  }, [client]);

  return {
    client,
    configured,
    missingEnv,
    loading,
    session,
    user: session?.user ?? null,
    profileError,
    nativeOffline,
    refreshSession: loadSession,
    signOut
  };
}
