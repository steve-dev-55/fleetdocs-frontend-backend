// FleetDocs — React hook for subscribing to alert-change events
//
// Re-runs the provided callback whenever an alert is resolved, acknowledged,
// created, etc.  Keeps the callback ref fresh so consumers don't need to
// worry about stale closures in the useEffect dependency array.

import * as React from "react";
import { onAlertsChanged } from "@/lib/alert-bus";

/**
 * Runs `callback` every time the global "alerts changed" event is dispatched.
 *
 * @param callback  Function to run (typically a refetch).
 */
export function useAlertEvents(callback: () => void): void {
  const savedCallback = React.useRef(callback);

  // Keep the ref up to date on every render
  React.useEffect(() => {
    savedCallback.current = callback;
  });

  React.useEffect(() => {
    return onAlertsChanged(() => savedCallback.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // subscribe only once
}
