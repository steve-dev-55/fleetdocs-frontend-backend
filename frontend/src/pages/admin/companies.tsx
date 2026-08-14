
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiGet, apiPut, apiDelete, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { Loader2, Pencil, Trash2, ArrowLeft } from "lucide-react";

interface Company {
  id: string;
  name: string;
  siret?: string;
  plan?: string;
  max_vehicles: number;
  city?: string;
  country?: string;
  created_at: string;
  vehicle_count: number;
  user_count: number;
  document_count: number;
  subscription_status?: string;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editCompany, setEditCompany] = React.useState<Company | null>(null);
  const [editForm, setEditForm] = React.useState({ name: "", plan: "starter", max_vehicles: 50 });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Company[]>("/api/admin/companies");
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      appToast.error("Erreur", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const handleEdit = (c: Company) => {
    setEditCompany(c);
    setEditForm({ name: c.name, plan: c.plan ?? "starter", max_vehicles: c.max_vehicles });
  };

  const handleSave = async () => {
    if (!editCompany) return;
    try {
      await apiPut(`/api/admin/companies/${editCompany.id}`, editForm);
      appToast.success("Société mise à jour");
      setEditCompany(null);
      void load();
    } catch (err) {
      appToast.error("Erreur", { description: getErrorMessage(err) });
    }
  };

  const handleDelete = async (c: Company) => {
    if (!confirm(`Supprimer définitivement "${c.name}" et toutes ses données ?`)) return;
    try {
      await apiDelete(`/api/admin/companies/${c.id}`);
      appToast.success("Société supprimée");
      void load();
    } catch (err) {
      appToast.error("Erreur", { description: getErrorMessage(err) });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/admin"><ArrowLeft className="size-4" /> Retour</Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Sociétés</h1>
        <p className="mt-1 text-sm text-muted-foreground">{companies.length} société(s) inscrite(s).</p>
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Société</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Véhicules</TableHead>
                  <TableHead className="text-center">Utilisateurs</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead>Abonnement</TableHead>
                  <TableHead className="hidden md:table-cell">Créée le</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        {c.city && <p className="text-xs text-muted-foreground">{c.city}, {c.country}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={c.plan === "pro" ? "default" : "secondary"}>{c.plan ?? "—"}</Badge></TableCell>
                    <TableCell className="text-center">{c.vehicle_count} / {c.max_vehicles}</TableCell>
                    <TableCell className="text-center">{c.user_count}</TableCell>
                    <TableCell className="text-center">{c.document_count}</TableCell>
                    <TableCell><Badge variant={c.subscription_status === "active" ? "default" : "outline"}>{c.subscription_status ?? "—"}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(c.created_at)}</TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editCompany} onOpenChange={(o) => !o && setEditCompany(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Modifier la société</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nom</label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Plan</label>
              <Select value={editForm.plan} onValueChange={(v) => setEditForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter (50 véh)</SelectItem>
                  <SelectItem value="pro">Pro (200 véh)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (10000 véh)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max véhicules</label>
              <Input type="number" value={editForm.max_vehicles} onChange={(e) => setEditForm(f => ({ ...f, max_vehicles: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>Annuler</Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
