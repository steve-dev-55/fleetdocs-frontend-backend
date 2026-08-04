

// FleetDocs — Column visibility hook (P2-2)
// Persisted in localStorage per table.

import * as React from "react";

export interface ColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
}

const STORAGE_PREFIX = "fleetdocs-columns-";

export function useColumnVisibility(tableKey: string, columns: ColumnDef[]) {
  const storageKey = `${STORAGE_PREFIX}${tableKey}`;
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of columns) init[c.id] = c.defaultVisible;
    return init;
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, boolean>;
        setVisible((prev) => ({ ...prev, ...saved }));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggle = React.useCallback(
    (id: string) => {
      setVisible((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey]
  );

  const isVisible = React.useCallback(
    (id: string) => visible[id] !== false,
    [visible]
  );

  return { visible, isVisible, toggle, columns };
}
