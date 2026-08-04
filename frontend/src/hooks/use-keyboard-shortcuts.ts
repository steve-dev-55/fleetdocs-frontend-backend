

// FleetDocs — Keyboard shortcuts (P2-16)
// g v → /vehicles
// g d → /dashboard
// g D (shift) → /documents
// g a → /alerts
// g s → /settings
// ? → open shortcuts help dialog
// cmd+k → already opens command palette

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCommandPalette } from "@/components/layout/command-palette";

const SHORTCUT_NAV: Record<string, string> = {
  v: "/vehicles",
  d: "/dashboard",
  a: "/alerts",
  s: "/settings",
  e: "/exports",
  // Documents is special: "g D" (shift+d)
};

export interface ShortcutDef {
  keys: string;
  description: string;
  category: "Navigation" | "Actions";
}

export const ALL_SHORTCUTS: ShortcutDef[] = [
  { keys: "g v", description: "Aller aux Véhicules", category: "Navigation" },
  { keys: "g d", description: "Aller au Tableau de bord", category: "Navigation" },
  { keys: "g D", description: "Aller aux Documents", category: "Navigation" },
  { keys: "g a", description: "Aller aux Alertes", category: "Navigation" },
  { keys: "g s", description: "Aller aux Paramètres", category: "Navigation" },
  { keys: "g e", description: "Aller aux Exports", category: "Navigation" },
  { keys: "⌘K", description: "Ouvrir le menu de commandes", category: "Actions" },
  { keys: "?", description: "Afficher l'aide des raccourcis", category: "Actions" },
  { keys: "Esc", description: "Fermer les dialogues", category: "Actions" },
];

export function useKeyboardShortcuts(onShowHelp: () => void) {
  const navigate = useNavigate();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const lastGRef = React.useRef<number>(0);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable ||
        target?.getAttribute("role") === "combobox" ||
        target?.getAttribute("role") === "textbox";

      if (isTyping) return;

      // ? → show help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onShowHelp();
        return;
      }

      // ⌘K → command palette (handled elsewhere too, but ensure here)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // g + key sequences
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        lastGRef.current = Date.now();
        return;
      }

      // Check if within 1s of pressing 'g'
      const sinceG = Date.now() - lastGRef.current;
      if (sinceG < 1000 && sinceG > 0) {
        const key = e.key;
        if (key === "D" /* shift+d */ ) {
          e.preventDefault();
          navigate("/documents");
          lastGRef.current = 0;
          return;
        }
        const target = SHORTCUT_NAV[key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate(target);
          lastGRef.current = 0;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, setCommandOpen, onShowHelp]);
}
