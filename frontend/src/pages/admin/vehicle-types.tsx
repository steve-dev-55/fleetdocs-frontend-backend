import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet, apiPost, apiPut, apiDelete, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { Truck, Plus, Pencil, Trash2 } from "lucide-react";

interface VehicleTypeItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_global?: boolean;
}

const GLOBAL_CODES = new Set(["Fourgon", "Poids_lourd", "Utilitaire", "VUL"]);

export default function VehicleTypesPage() {
  const [items, setItems] = React.useState<VehicleTypeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ name: "", code: "", description: "" });
  const [editing, setEditing] = React.useState<VehicleTypeItem | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<VehicleTypeItem[]>("/api/vehicle-types");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      appToast.error("Erreur", {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setForm({ name: "", code: "", description: "" });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      appToast.error("Nom et code obligatoires");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/api/vehicle-types/${editing.id}`, {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
        });
        appToast.success("Type de véhicule mis à jour");
      } else {
        await apiPost("/api/vehicle-types", {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
        });
        appToast.success("Type de véhicule créé");
      }
      resetForm();
      void load();
    } catch (err) {
      appToast.error("Erreur", {
        description: getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: VehicleTypeItem) => {
    if (item.is_global) {
      appToast.error("Impossible de supprimer un type global");
      return;
    }
    if (!confirm(`Supprimer le type « ${item.name} » ?`)) return;
    try {
      await apiDelete(`/api/vehicle-types/${item.id}`);
      appToast.success("Type de véhicule supprimé");
      if (editing?.id === item.id) resetForm();
      void load();
    } catch (err) {
      appToast.error("Erreur", {
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Truck className="size-6" />
            Types de véhicules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez les types de véhicules disponibles dans votre flotte.
          </p>
        </div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            {editing ? "Modifier le type" : "Nouveau type"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nom</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex : Poids lourd"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Ex : Poids_lourd"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optionnelle"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {editing ? "Enregistrer" : <><Plus className="size-4" /> Créer</>}
            </Button>
            {editing && (
              <Button variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Portée</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun type de véhicule.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium text-foreground">{it.name}</TableCell>
                      <TableCell className="font-mono text-xs">{it.code}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {it.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        {it.is_global ? (
                          <Badge variant="secondary">Global</Badge>
                        ) : (
                          <Badge>Société</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(it)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(it)}
                            disabled={Boolean(it.is_global)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}