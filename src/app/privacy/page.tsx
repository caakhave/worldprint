import type { Metadata } from "next";
import { LegalContent } from "@/app/legal/page";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy - Can You Geo?",
  description:
    "Read the Can You Geo privacy policy, including account data, gameplay data, browser storage, analytics, and support requests.",
  path: "/privacy/"
});

export default function PrivacyPage() {
  return <LegalContent />;
}
