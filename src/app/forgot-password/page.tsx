import type { Metadata } from "next";
import { ForgotPasswordClient } from "@/features/account/ForgotPasswordClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Reset Password",
  description: "Request a Can You Geo? password reset email.",
  path: "/forgot-password/",
  noIndex: true
});

export default function ForgotPasswordPage() {
  return (
    <section className="account-page account-page-shell page-shell info-page-shell" aria-labelledby="forgot-password-title">
      <div className="account-hero">
        <p className="eyebrow">Password help</p>
        <h1 id="forgot-password-title" className="page-title">
          Reset your password.
        </h1>
        <p className="lead">We will send a secure reset link to the email on your account.</p>
      </div>

      <div className="account-grid account-grid-single">
        <ForgotPasswordClient />
      </div>
    </section>
  );
}
