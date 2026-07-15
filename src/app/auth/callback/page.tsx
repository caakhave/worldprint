import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCallbackClient } from "@/features/account/AuthCallbackClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Signing In",
  description: "Finish signing in to Can You Geo?.",
  path: "/auth/callback/",
  noIndex: true
});

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <section className="account-page account-page-shell page-shell" aria-labelledby="auth-callback-loading-title">
          <div className="surface account-card account-primary-card">
            <p className="eyebrow">Account sign-in</p>
            <h1 id="auth-callback-loading-title" className="page-title">
              Signing you in...
            </h1>
            <p>Saving the account session on this device.</p>
          </div>
        </section>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
