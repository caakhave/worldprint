import { missingSupabasePublicEnv } from "@/lib/supabase/env";

export type AuthShellStatus = {
  supabaseConfigured: boolean;
  missingPublicEnv: string[];
  futurePublicEnv: string[];
  futureServerEnv: string[];
};

const futurePublicEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"] as const;
const futureServerEnv = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_YEARLY_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "NEXT_PUBLIC_SITE_URL"
] as const;

export function getAuthShellStatus(): AuthShellStatus {
  const missingSupabaseEnv = missingSupabasePublicEnv();
  const missingPublicEnv = futurePublicEnv.filter((key) => !process.env[key]);
  return {
    supabaseConfigured: missingSupabaseEnv.length === 0,
    missingPublicEnv,
    futurePublicEnv: [...futurePublicEnv],
    futureServerEnv: [...futureServerEnv]
  };
}
