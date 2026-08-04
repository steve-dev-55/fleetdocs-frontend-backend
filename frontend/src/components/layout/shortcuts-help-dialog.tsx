

// FleetDocs — Keyboard shortcuts help dialog (P2-16)
// Triggered by pressing ?

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ALL_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const categories = ["Navigation", "Actions"] as const;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Utilisez ces raccourcis pour naviguer plus vite dans FleetDocs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {cat}
              </h3>
              <div className="space-y-2">
                {ALL_SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-foreground">
                      {s.description}
                    </span>
                    <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-foreground">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            <p>
              <Badge variant="outline" className="mr-1">Astuce</Badge>
              Survolez les éléments de la barre latérale pour voir leurs raccourcis.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
