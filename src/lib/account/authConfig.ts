import { missingSupabasePublicEnv } from "@/lib/supabase/env";

export type AuthShellStatus = {
  supabaseConfigured: boolean;
  missingPublicEnv: string[];
  futurePublicEnv: string[];
  futureServerEnv: string[];
};

const futurePublicEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"] as const;
const futureServerEnv = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_YEARLY_PRICE_ID",
  "STRIPE_PRO_PRICE_ID"
] as const;

export function getAuthShellStatus(): AuthShellStatus {
  const missingPublicEnv = missingSupabasePublicEnv();
  return {
    supabaseConfigured: missingPublicEnv.length === 0,
    missingPublicEnv,
    futurePublicEnv: [...futurePublicEnv],
    futureServerEnv: [...futureServerEnv]
  };
}
