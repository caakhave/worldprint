"use client";

import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { isNativeAppBuild } from "@/lib/site/buildTarget";

type BackButtonEvent = {
  canGoBack: boolean;
};

const BACK_HANDLER_RELEASE_MS = 250;

function isRootPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  return normalizedPathname === "/" || normalizedPathname === "/index.html";
}

export function shouldNavigateBackWithinWebView(event: BackButtonEvent, pathname: string): boolean {
  return event.canGoBack && !isRootPath(pathname);
}

export function NativeAppBridge() {
  useEffect(() => {
    if (!isNativeAppBuild() || Capacitor.getPlatform() !== "android") return;

    let active = true;
    let listenerHandle: PluginListenerHandle | undefined;
    let handlingBack = false;
    let releaseTimer: number | undefined;

    const releaseBackHandler = () => {
      handlingBack = false;
      releaseTimer = undefined;
    };

    const registerBackListener = async () => {
      try {
        const { App } = await import("@capacitor/app");

        if (!active) return;

        const handle = await App.addListener("backButton", (event: BackButtonEvent) => {
          if (!active || handlingBack) return;

          handlingBack = true;
          if (releaseTimer) window.clearTimeout(releaseTimer);
          releaseTimer = window.setTimeout(releaseBackHandler, BACK_HANDLER_RELEASE_MS);

          if (shouldNavigateBackWithinWebView(event, window.location.pathname)) {
            window.history.back();
            return;
          }

          void App.minimizeApp();
        });

        if (active) {
          listenerHandle = handle;
          return;
        }

        void handle.remove();
      } catch {
        // The bridge should never make the app fail to render if native plugin wiring is unavailable.
      }
    };

    void registerBackListener();

    return () => {
      active = false;
      if (releaseTimer) window.clearTimeout(releaseTimer);
      if (listenerHandle) void listenerHandle.remove();
    };
  }, []);

  return null;
}
