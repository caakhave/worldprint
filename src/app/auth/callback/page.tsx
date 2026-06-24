import type { Metadata } from "next";
import { AuthCallbackClient } from "@/features/account/AuthCallbackClient";

export const metadata: Metadata = {
  title: "Signing In",
  description: "Finish signing in to Can You Geo?."
};

export default function AuthCallbackPage() {
  return <AuthCallbackClient />;
}
