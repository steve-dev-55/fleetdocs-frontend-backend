import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { ROLE_LABELS } from "@/lib/status-config";
import { formatDate } from "@/lib/utils";
import { UserPlus, Loader2 } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  last_login_at?: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviting, setInviting] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", first_name: "", last_name: "", role: "operator" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<UserItem[] | { items: UserItem[] }>("/api/users");
      const items = Array.isArray(data) ? data : data.items ?? [];
      setUsers(items);
    } catch (err) {
      appToast.error("Erreur", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const handleInvite = async () => {
    if (!form.email || !form.first_name || !form.last_name) {
      appToast.error("Tous les champs sont obligatoires");
      return;
    }
    setInviting(true);
    try {
      await apiPost("/api/users/invite", form);
      appToast.success("Invitation envoyée", { description: `${form.email} a été invité.` });
      setInviteOpen(false);
      setForm({ email: "", first_name: "", last_name: "", role: "operator" });
      void load();
    } catch (err) {
      appToast.error("Erreur", { description: getErrorMessage(err) });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Utilisateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les utilisateurs de votre entreprise.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Inviter
        </Button>
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Dernière connexion</TableHead>
                  <TableHead className="hidden md:table-cell">Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun utilisateur.</TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                            {u.first_name[0]?.toUpperCase()}{u.last_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === "active" ? "default" : "outline"}>
                          {u.status === "active" ? "Actif" : u.status === "invited" ? "Invité" : u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {u.last_login_at ? formatDate(u.last_login_at) : "Jamais"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {formatDate(u.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prénom *</Label>
                <Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@entreprise.com" />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="fleet_manager">Gestionnaire de flotte</SelectItem>
                  <SelectItem value="operator">Opérateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? <Loader2 className="size-4 animate-spin" /> : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
