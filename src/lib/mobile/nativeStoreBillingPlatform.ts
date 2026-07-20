"use client";

import { Capacitor } from "@capacitor/core";
import { isNativeAppBuild } from "@/lib/site/buildTarget";

export type NativeStoreBillingPlatform = "android" | "ios" | "native-preview" | "web";

export function nativeStoreBillingPlatform(nativeBuild = isNativeAppBuild()): NativeStoreBillingPlatform {
  if (!nativeBuild) return "web";
  try {
    const platform = Capacitor.getPlatform();
    if (platform === "android") return "android";
    if (platform === "ios") return "ios";
    return "native-preview";
  } catch {
    return "native-preview";
  }
}

export function nativeStoreBillingLabel(platform = nativeStoreBillingPlatform()): string {
  if (platform === "ios") return "Apple purchases";
  if (platform === "android") return "Google Play purchases";
  return "Mobile purchases";
}

export function nativeStoreBillingUnavailableLabel(platform = nativeStoreBillingPlatform()): string {
  if (platform === "ios") return "Apple purchases unavailable";
  if (platform === "android") return "Google Play unavailable";
  return "Mobile purchases unavailable";
}

export function nativeStoreBillingSignInCopy(platform = nativeStoreBillingPlatform()): string {
  if (platform === "ios") return "Sign in before starting an Apple purchase. Free play needs no card.";
  if (platform === "android") return "Sign in before starting a Google Play purchase. Free play needs no card.";
  return "Sign in before starting a mobile purchase. Free play needs no card.";
}

export function nativeStoreBillingBoundaryCopy(platform = nativeStoreBillingPlatform()): string {
  if (platform === "ios") return "Apple manages iOS purchases. Stripe checkout is unavailable in this iOS build.";
  if (platform === "android") return "Google Play manages Android purchases. Stripe checkout is unavailable in this Android build.";
  return "Store purchases are unavailable in this preview. Stripe checkout is unavailable in this native build.";
}
