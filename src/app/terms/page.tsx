import type { Metadata } from "next";
import { LegalContent } from "@/app/legal/page";
import { pageMetadata } from "@/lib/site/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use - Can You Geo?",
  description:
    "Read the Can You Geo terms of use for accounts, Free and Pro access, billing readiness, fair play, stats, and source data.",
  path: "/terms/"
});

export default function TermsPage() {
  return <LegalContent />;
}
