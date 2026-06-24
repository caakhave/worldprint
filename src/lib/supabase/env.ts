export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export const SUPABASE_PUBLIC_ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function missingSupabasePublicEnv(): string[] {
  return SUPABASE_PUBLIC_ENV_KEYS.filter((key) => !process.env[key]);
}

export function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
