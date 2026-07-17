"use client";

import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { isNativeAppBuild } from "@/lib/site/buildTarget";
import {
  consumeNativeBackEntry,
  installNativeNavigationHistoryTracker,
  nativeBackAction,
  resetNativeNavigationHistory,
  uninstallNativeNavigationHistoryTracker
} from "@/lib/mobile/nativeNavigationHistory";

type BackButtonEvent = {
  canGoBack: boolean;
};

const BACK_HANDLER_RELEASE_MS = 250;

export function shouldNavigateBackWithinWebView(event: BackButtonEvent, pathname: string): boolean {
  return nativeBackAction(event.canGoBack, pathname).action === "back";
}

export function NativeAppBridge() {
  useEffect(() => {
    if (!isNativeAppBuild() || Capacitor.getPlatform() !== "android") return;

    document.documentElement.classList.add("cgy-native-android");
    resetNativeNavigationHistory();
    installNativeNavigationHistoryTracker();

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

          const backAction = nativeBackAction(event.canGoBack, window.location.pathname);
          if (backAction.action === "back") {
            if (backAction.consumeTrackedEntry) consumeNativeBackEntry();
            window.history.back();
            return;
          }

          resetNativeNavigationHistory();
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
      document.documentElement.classList.remove("cgy-native-android");
      if (releaseTimer) window.clearTimeout(releaseTimer);
      if (listenerHandle) void listenerHandle.remove();
      uninstallNativeNavigationHistoryTracker();
      resetNativeNavigationHistory();
    };
  }, []);

  return null;
}
