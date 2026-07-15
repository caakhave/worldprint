import { createBrowserClient } from "@supabase/ssr";
import { Capacitor } from "@capacitor/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createNativeSupabaseAuthStorage, nativeSupabaseAuthStorageKey } from "@/lib/supabase/nativeAuthStorage";

export type CanYouGeoSupabaseClient = SupabaseClient<Database>;

let browserClient: CanYouGeoSupabaseClient | null = null;

function isNativeCapacitorRuntime(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function createNativeSupabaseClient(url: string, anonKey: string): CanYouGeoSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      storage: createNativeSupabaseAuthStorage(),
      storageKey: nativeSupabaseAuthStorageKey(url),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
}

export function createSupabaseBrowserClient(): CanYouGeoSupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  browserClient ??= isNativeCapacitorRuntime()
    ? createNativeSupabaseClient(config.url, config.anonKey)
    : createBrowserClient<Database>(config.url, config.anonKey);
  return browserClient;
}

export function resetSupabaseBrowserClientForTests() {
  browserClient = null;
}
