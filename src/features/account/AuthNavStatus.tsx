"use client";

import Link from "next/link";
import { useSupabaseAccount } from "@/features/account/useSupabaseAccount";

export function AuthNavStatus() {
  const { configured, loading, user } = useSupabaseAccount();
  if (!configured) {
    return <Link href="/account">Account</Link>;
  }
  if (loading) {
    return <Link href="/account">Account</Link>;
  }
  return <Link href={user ? "/account" : "/sign-in"}>{user ? "Account" : "Save progress"}</Link>;
}
