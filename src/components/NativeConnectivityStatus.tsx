"use client";

import { useEffect, useState } from "react";
import {
  browserReportsOnline,
  isNativeAppCurrentlyOfflineAsync,
  NATIVE_OFFLINE_STATUS_MESSAGE,
  shouldUseNativeConnectivityGuard
} from "@/lib/mobile/nativeConnectivity";

export function NativeConnectivityStatus() {
  const [enabled, setEnabled] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const shouldEnable = shouldUseNativeConnectivityGuard();
    setEnabled(shouldEnable);
    if (!shouldEnable) return;

    let cancelled = false;
    let refreshId = 0;
    const refreshOnlineStatus = () => {
      const currentRefreshId = (refreshId += 1);
      if (!browserReportsOnline()) {
        setOnline(false);
        return;
      }
      void isNativeAppCurrentlyOfflineAsync().then((offline) => {
        if (!cancelled && currentRefreshId === refreshId) setOnline(!offline);
      });
    };
    refreshOnlineStatus();
    window.addEventListener("online", refreshOnlineStatus);
    window.addEventListener("offline", refreshOnlineStatus);
    const interval = window.setInterval(refreshOnlineStatus, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", refreshOnlineStatus);
      window.removeEventListener("offline", refreshOnlineStatus);
    };
  }, []);

  if (!enabled || online) return null;

  return (
    <div className="native-connectivity-status" role="status" aria-live="polite">
      {NATIVE_OFFLINE_STATUS_MESSAGE}
    </div>
  );
}
