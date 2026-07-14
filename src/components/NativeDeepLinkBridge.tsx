"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import {
  nativeDeepLinkDedupeKey,
  parseNativeDeepLinkUrl,
  type NativeDeepLinkAccepted,
  type NativeDeepLinkNavigation
} from "@/lib/mobile/nativeDeepLink";
import { resetNativeNavigationHistory } from "@/lib/mobile/nativeNavigationHistory";

type IncomingUrlEvent = {
  url?: string | null;
};

type AppPlugin = {
  getLaunchUrl: () => Promise<IncomingUrlEvent | null | undefined>;
  addListener: (eventName: "appUrlOpen", listener: (event: IncomingUrlEvent) => void) => Promise<PluginListenerHandle>;
};

type NativeRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
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

function currentBrowserDestination() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function requestNavigationCheckFrame(callback: () => void) {
  if (typeof window.requestAnimationFrame === "function") {
    const frame = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(frame);
  }

  const timeout = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeout);
}

function schedulePostNavigationCheck(
  destination: string,
  navigation: NativeDeepLinkNavigation,
  router: NativeRouter,
  isActive: () => boolean
) {
  let cancelInnerFrame: (() => void) | undefined;
  const cancelOuterFrame = requestNavigationCheckFrame(() => {
    cancelInnerFrame = requestNavigationCheckFrame(() => {
      if (!isActive() || currentBrowserDestination() === destination) return;
      router[navigation](destination);
    });
  });

  return () => {
    cancelOuterFrame();
    if (cancelInnerFrame) cancelInnerFrame();
  };
}

export function NativeDeepLinkBridge() {
  const router = useRouter();
  const lastNavigationRef = useRef<{ key: string; at: number } | null>(null);
  const pendingNavigationChecksRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (!shouldRegisterNativeDeepLinkBridge(platform)) return;

    let active = true;
    let listenerHandle: PluginListenerHandle | undefined;

    const cancelPendingNavigationChecks = () => {
      for (const cancel of pendingNavigationChecksRef.current) cancel();
      pendingNavigationChecksRef.current = [];
    };

    const rememberNavigationCheck = (cancel: () => void) => {
      pendingNavigationChecksRef.current.push(cancel);
    };

    const issueNavigation = (destination: string, navigation: NativeDeepLinkNavigation) => {
      cancelPendingNavigationChecks();
      router[navigation](destination);
      rememberNavigationCheck(schedulePostNavigationCheck(destination, navigation, router, () => active));
    };

    const navigateToAcceptedLink = (result: NativeDeepLinkAccepted, source: "cold" | "warm") => {
      const key = nativeDeepLinkDedupeKey(result);
      const now = Date.now();
      if (shouldSkipDuplicateNativeDeepLink(lastNavigationRef.current, key, now)) return;

      lastNavigationRef.current = { key, at: now };
      const navigation = source === "cold" ? "replace" : result.navigation;
      if (navigation === "replace") {
        resetNativeNavigationHistory();
        issueNavigation(result.destination, "replace");
        return;
      }
      issueNavigation(result.destination, "push");
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
        const handle = await App.addListener("appUrlOpen", (event) => handleIncomingUrl(event.url, "warm"));
        if (active) {
          listenerHandle = handle;
        } else {
          void handle.remove();
        }
      } catch {
        // Incoming warm links are optional for this shell checkpoint; cold launch URL lookup can still recover.
      }

      try {
        const launchUrl = await lookupLaunchUrl(App);
        handleIncomingUrl(launchUrl?.url, "cold");
      } catch {
        // A launch URL lookup failure should not block the static app from loading normally.
      }
    };

    void initializeIncomingUrlHandling();

    return () => {
      active = false;
      cancelPendingNavigationChecks();
      if (listenerHandle) void listenerHandle.remove();
    };
  }, [router]);

  return null;
}
