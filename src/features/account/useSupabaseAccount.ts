"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureProfile } from "@/lib/account/sync";
import { createSupabaseBrowserClient, type CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import { missingSupabasePublicEnv } from "@/lib/supabase/env";

export type SupabaseAccountState = {
  client: CanYouGeoSupabaseClient | null;
  configured: boolean;
  missingEnv: string[];
  loading: boolean;
  session: Session | null;
  user: User | null;
  profileError: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<{ error: string | null }>;
};

export function useSupabaseAccount(): SupabaseAccountState {
  const missingEnv = useMemo(() => missingSupabasePublicEnv(), []);
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const configured = Boolean(client);
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!client) {
      setLoading(false);
      setSession(null);
      return;
    }
    setLoading(true);
    const { data, error } = await client.auth.getSession();
    if (error) {
      setProfileError(error.message);
      setSession(null);
      setLoading(false);
      return;
    }
    setSession(data.session);
    if (data.session?.user) {
      const profile = await ensureProfile(client, data.session.user);
      setProfileError(profile.error);
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!client) return undefined;
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void ensureProfile(client, nextSession.user).then((result) => setProfileError(result.error));
      }
    });
    return () => subscription.unsubscribe();
  }, [client]);

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
    refreshSession: loadSession,
    signOut
  };
}
