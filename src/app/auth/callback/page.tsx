import type { Metadata } from "next";
import { AuthCallbackClient } from "@/features/account/AuthCallbackClient";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Signing In",
  description: "Finish signing in to Can You Geo?.",
  path: "/auth/callback/",
  noIndex: true
});

export default function AuthCallbackPage() {
  return <AuthCallbackClient />;
}
