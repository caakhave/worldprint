"use client";

import { useEffect } from "react";
import { handleNativeExternalAnchorClick } from "@/lib/mobile/nativeExternalNavigation";

export function NativeExternalNavigationGuard() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      handleNativeExternalAnchorClick(event);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
