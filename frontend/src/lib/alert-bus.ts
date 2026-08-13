// FleetDocs — Alert change event bus (P3-8)
//
// Lightweight pub/sub over a DOM CustomEvent so that components that are NOT
// in a direct parent/child relationship (sidebar, header, alerts page) can
// notify each other when alert data changes (resolve, acknowledge, create…).
//
// Usage:
//   // After a mutation:
//   notifyAlertsChanged();
//
//   // In any component that shows alert counts:
//   useAlertEvents(() => refetch());

const ALERTS_CHANGED_EVENT = "fleetdocs:alerts:changed";

/**
 * Broadcasts an event indicating that alert data has changed.
 * Call this after any mutation that resolves/acknowledges/creates alerts.
 */
export function notifyAlertsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT));
}

/**
 * Subscribe to alert-change events.
 * @returns an unsubscribe function.
 */
export function onAlertsChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(ALERTS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handler);
}
