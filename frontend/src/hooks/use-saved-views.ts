

// FleetDocs — Saved views / favorites for vehicles (P2-1)
// Persisted in localStorage. Default views + custom.

import * as React from "react";

export interface SavedView {
  id: string;
  name: string;
  filters: {
    search: string;
    status: string;
    type: string;
    compliance: string;
  };
  created_at: string;
  isDefault?: boolean;
}

const STORAGE_KEY = "fleetdocs-vehicles-saved-views";

export const DEFAULT_VIEWS: SavedView[] = [
  {
    id: "all",
    name: "Tous les véhicules",
    filters: { search: "", status: "all", type: "all", compliance: "all" },
    created_at: "",
    isDefault: true,
  },
  {
    id: "broken",
    name: "En panne",
    filters: { search: "", status: "broken_down", type: "all", compliance: "all" },
    created_at: "",
    isDefault: true,
  },
  {
    id: "compliance-red",
    name: "Conformité rouge",
    filters: { search: "", status: "all", type: "all", compliance: "red" },
    created_at: "",
    isDefault: true,
  },
];

function readViews(): SavedView[] {
  if (typeof window === "undefined") return DEFAULT_VIEWS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIEWS;
    const custom = JSON.parse(raw) as SavedView[];
    return [...DEFAULT_VIEWS, ...custom];
  } catch {
    return DEFAULT_VIEWS;
  }
}

function writeCustomViews(views: SavedView[]): void {
  if (typeof window === "undefined") return;
  try {
    const custom = views.filter((v) => !v.isDefault);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // ignore
  }
}

export function useSavedViews() {
  const [views, setViews] = React.useState<SavedView[]>(DEFAULT_VIEWS);

  React.useEffect(() => {
    setViews(readViews());
  }, []);

  const addView = React.useCallback(
    (name: string, filters: SavedView["filters"]) => {
      const newView: SavedView = {
        id: `view-${Date.now()}`,
        name,
        filters,
        created_at: new Date().toISOString(),
      };
      setViews((prev) => {
        const next = [...prev, newView];
        writeCustomViews(next);
        return next;
      });
      return newView;
    },
    []
  );

  const removeView = React.useCallback((id: string) => {
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id || v.isDefault);
      writeCustomViews(next);
      return next;
    });
  }, []);

  return { views, addView, removeView };
}
