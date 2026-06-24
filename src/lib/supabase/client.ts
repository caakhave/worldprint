import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export type CanYouGeoSupabaseClient = SupabaseClient<Database>;

let browserClient: CanYouGeoSupabaseClient | null = null;

export function createSupabaseBrowserClient(): CanYouGeoSupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  browserClient ??= createBrowserClient<Database>(config.url, config.anonKey);
  return browserClient;
}
