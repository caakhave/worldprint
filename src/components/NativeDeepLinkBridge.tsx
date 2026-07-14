"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import { nativeDeepLinkDedupeKey, parseNativeDeepLinkUrl, type NativeDeepLinkAccepted } from "@/lib/mobile/nativeDeepLink";
import { resetNativeNavigationHistory } from "@/lib/mobile/nativeNavigationHistory";

type IncomingUrlEvent = {
  url?: string | null;
};

type AppPlugin = {
  getLaunchUrl: () => Promise<IncomingUrlEvent | null | undefined>;
  addListener: (eventName: "appUrlOpen", listener: (event: IncomingUrlEvent) => void) => Promise<PluginListenerHandle>;
};

const DUPLICATE_DEEP_LINK_WINDOW_MS = 2000;
const LAUNCH_URL_LOOKUP_TIMEOUT_MS = 2500;
const NATIVE_DEEP_LINK_PLATFORMS = new Set(["ios", "android"]);

export function shouldRegisterNativeDeepLinkBridge(platform: string, nativeBuild = isNativeAppBuild()): boolean {
  return nativeBuild && NATIVE_DEEP_LINK_PLATFORMS.has(platform);
}

export function shouldSkipDuplicateNativeDeepLink(
  lastNavigation: { key: string; at: number } | null,
  key: string,
  now: number,
  duplicateWindowMs = DUPLICATE_DEEP_LINK_WINDOW_MS
): boolean {
  return Boolean(lastNavigation && lastNavigation.key === key && now - lastNavigation.at < duplicateWindowMs);
}

async function lookupLaunchUrl(App: AppPlugin): Promise<IncomingUrlEvent | null | undefined> {
  let timeout: number | undefined;
  try {
    return await Promise.race([
      App.getLaunchUrl(),
      new Promise<undefined>((resolve) => {
        timeout = window.setTimeout(() => resolve(undefined), LAUNCH_URL_LOOKUP_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

export function NativeDeepLinkBridge() {
  const router = useRouter();
  const lastNavigationRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (!shouldRegisterNativeDeepLinkBridge(platform)) return;

    let active = true;
    let listenerHandle: PluginListenerHandle | undefined;

    const navigateToAcceptedLink = (result: NativeDeepLinkAccepted, source: "cold" | "warm") => {
      const key = nativeDeepLinkDedupeKey(result);
      const now = Date.now();
      if (shouldSkipDuplicateNativeDeepLink(lastNavigationRef.current, key, now)) return;

      lastNavigationRef.current = { key, at: now };
      const navigation = source === "cold" ? "replace" : result.navigation;
      if (navigation === "replace") {
        resetNativeNavigationHistory();
        router.replace(result.destination);
        return;
      }
      router.push(result.destination);
    };

    const handleIncomingUrl = (rawUrl: string | null | undefined, source: "cold" | "warm") => {
      if (!active || !rawUrl) return;
      const parsed = parseNativeDeepLinkUrl(rawUrl);
      if (!parsed.accepted) return;
      navigateToAcceptedLink(parsed, source);
    };

    const initializeIncomingUrlHandling = async () => {
      let App: AppPlugin;
      try {
        App = (await import("@capacitor/app")).App as AppPlugin;
      } catch {
        return;
      }

      try {
        const launchUrl = await lookupLaunchUrl(App);
        handleIncomingUrl(launchUrl?.url, "cold");
      } catch {
        // A launch URL lookup failure should not block the static app from loading normally.
      }

      try {
        const handle = await App.addListener("appUrlOpen", (event) => handleIncomingUrl(event.url, "warm"));
        if (active) {
          listenerHandle = handle;
        } else {
          void handle.remove();
        }
      } catch {
        // Incoming links are optional for this shell checkpoint; rendering must continue if native wiring is unavailable.
      }
    };

    void initializeIncomingUrlHandling();

    return () => {
      active = false;
      if (listenerHandle) void listenerHandle.remove();
    };
  }, [router]);

  return null;
}
