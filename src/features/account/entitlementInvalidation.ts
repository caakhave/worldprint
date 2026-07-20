export const ENTITLEMENT_CHANGED_EVENT = "cgy:entitlement-changed";

export function notifyEntitlementChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ENTITLEMENT_CHANGED_EVENT));
}

export function subscribeEntitlementChanged(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(ENTITLEMENT_CHANGED_EVENT, listener);
  return () => window.removeEventListener(ENTITLEMENT_CHANGED_EVENT, listener);
}
