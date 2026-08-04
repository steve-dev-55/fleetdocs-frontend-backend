

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api-client";
import { appToast } from "@/lib/toast";

interface CustomFieldsCardProps {
  vehicleId: string;
}

const DEFAULT_FIELDS = [
  { key: "kilometrage_actuel", label: "Kilométrage actuel" },
  { key: "prochain_entretien", label: "Prochain entretien" },
  { key: "cout_mensuel", label: "Coût mensuel" },
];

export function CustomFieldsCard({ vehicleId }: CustomFieldsCardProps) {
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [newKey, setNewKey] = React.useState("");
  const [newLabel, setNewLabel] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [labels, setLabels] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<Record<string, string>>(
        `/api/vehicles/${vehicleId}/custom-fields`
      );
      setFields(data);
      const lab: Record<string, string> = {};
      for (const k of Object.keys(data)) {
        const def = DEFAULT_FIELDS.find((d) => d.key === k);
        lab[k] = def?.label ?? k.replace(/_/g, " ");
      }
      setLabels(lab);
    } catch {
      // ignore
    }
  }, [vehicleId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveField = async (key: string, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    setEditing(null);
    try {
      await apiPut(`/api/vehicles/${vehicleId}/custom-fields`, next);
      appToast.success("Champ mis à jour");
    } catch {
      appToast.error("Erreur lors de la sauvegarde");
      setFields(fields);
    }
  };

  const removeField = async (key: string) => {
    const next = { ...fields };
    delete next[key];
    setFields(next);
    try {
      await apiPut(`/api/vehicles/${vehicleId}/custom-fields`, next);
      appToast.success("Champ supprimé");
    } catch {
      appToast.error("Erreur");
      setFields(fields);
    }
  };

  const addField = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    const next = { ...fields, [key]: "" };
    setFields(next);
    setLabels({ ...labels, [key]: newLabel.trim() });
    try {
      await apiPut(`/api/vehicles/${vehicleId}/custom-fields`, next);
      appToast.success("Champ ajouté");
      setNewKey("");
      setNewLabel("");
      setAdding(false);
    } catch {
      appToast.error("Erreur");
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Informations complémentaires
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="size-4" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {adding && (
          <div className="mb-4 p-3 rounded-md border border-dashed border-border bg-muted/30 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="new-label" className="text-xs">
                  Libellé
                </Label>
                <Input
                  id="new-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex : Date d'achat"
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="new-key" className="text-xs">
                  Clé (auto)
                </Label>
                <Input
                  id="new-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="laisser vide"
                  className="h-8 font-mono"
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setNewLabel("");
                }}
              >
                <X className="size-4" />
                Annuler
              </Button>
              <Button size="sm" onClick={addField} disabled={!newLabel.trim()}>
                <Check className="size-4" />
                Ajouter
              </Button>
            </div>
          </div>
        )}

        {Object.keys(fields).length === 0 && !adding ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Aucun champ personnalisé. Cliquez sur « Ajouter » pour en créer un.
          </div>
        ) : (
          <dl className="space-y-2">
            {Object.entries(fields).map(([key, value]) => (
              <div
                key={key}
                className="group flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border last:border-0"
              >
                <dt className="text-muted-foreground shrink-0">
                  {labels[key] ?? key}
                </dt>
                {editing === key ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveField(key, draft);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="h-8 w-40"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => void saveField(key, draft)}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditing(null)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <dd className="flex items-center gap-1 font-medium text-foreground text-right">
                    <span>{value || "—"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(key);
                        setDraft(value);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5"
                      aria-label="Modifier"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeField(key)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 p-0.5"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
