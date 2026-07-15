export type NativeBackAction = {
  action: "back" | "minimize";
  consumeTrackedEntry: boolean;
};

let trackedNavigationDepth = 0;
let trackedHistory: History | null = null;
let originalPushState: History["pushState"] | null = null;

export function isNativeRootPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  return normalizedPathname === "/" || normalizedPathname === "/index.html";
}

export function resetNativeNavigationHistory() {
  trackedNavigationDepth = 0;
}

export function markNativeHistoryPush() {
  trackedNavigationDepth += 1;
}

export function consumeNativeBackEntry() {
  if (trackedNavigationDepth > 0) trackedNavigationDepth -= 1;
}

export function nativeTrackedHistoryDepth(): number {
  return trackedNavigationDepth;
}

export function installNativeNavigationHistoryTracker(history: History = window.history) {
  if (trackedHistory === history) return;
  uninstallNativeNavigationHistoryTracker();

  trackedHistory = history;
  originalPushState = history.pushState;
  history.pushState = function pushState(...args: Parameters<History["pushState"]>) {
    const result = originalPushState?.apply(history, args);
    markNativeHistoryPush();
    return result;
  } as History["pushState"];
}

export function uninstallNativeNavigationHistoryTracker() {
  if (trackedHistory && originalPushState) {
    trackedHistory.pushState = originalPushState;
  }
  trackedHistory = null;
  originalPushState = null;
}

export function nativeBackAction(canGoBack: boolean, pathname: string, trackedHistoryDepth = trackedNavigationDepth): NativeBackAction {
  if (isNativeRootPath(pathname)) {
    return { action: "minimize", consumeTrackedEntry: false };
  }

  if (canGoBack) {
    return { action: "back", consumeTrackedEntry: trackedHistoryDepth > 0 };
  }

  if (trackedHistoryDepth > 0) {
    return { action: "back", consumeTrackedEntry: true };
  }

  return { action: "minimize", consumeTrackedEntry: false };
}
