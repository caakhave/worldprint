import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CanYouGeoSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

export async function createSupabaseServerClient(): Promise<CanYouGeoSupabaseClient | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. Route handlers or Server Actions can use this helper later.
        }
      }
    }
  });
}
