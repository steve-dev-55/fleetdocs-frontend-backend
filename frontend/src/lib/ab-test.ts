// FleetDocs — A/B testing infrastructure (mock PostHog)
// Persists variant per user in localStorage. 50/50 split.

const STORAGE_KEY = "fleetdocs-ab-variants";

type Variant = "A" | "B";

interface VariantMap {
  [experiment: string]: Variant;
}

function readVariants(): VariantMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as VariantMap;
  } catch {
    return {};
  }
}

function writeVariants(map: VariantMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getVariant(experimentName: string): Variant {
  const map = readVariants();
  if (map[experimentName]) return map[experimentName];
  const variant: Variant = Math.random() < 0.5 ? "A" : "B";
  map[experimentName] = variant;
  writeVariants(map);
  // Fire mock analytics event
  if (typeof window !== "undefined") {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ab_test_assigned",
        properties: { experiment: experimentName, variant },
      }),
    }).catch(() => {});
  }
  return variant;
}

export function setVariant(experimentName: string, variant: Variant): void {
  const map = readVariants();
  map[experimentName] = variant;
  writeVariants(map);
}

export function getAllVariants(): VariantMap {
  return readVariants();
}

// React hook
import * as React from "react";

export function useAbTest(experimentName: string): Variant {
  const [variant, setVariantState] = React.useState<Variant>("A");
  React.useEffect(() => {
    setVariantState(getVariant(experimentName));
  }, [experimentName]);
  return variant;
}
