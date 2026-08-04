

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Link2, Copy, Trash2, Plus, Clock, ExternalLink } from "lucide-react";

interface ShareLink {
  id: string;
  document_id: string;
  token: string;
  url: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  revoked: boolean;
}

export function ShareLinksSection({ documentId }: { documentId: string }) {
  const [links, setLinks] = React.useState<ShareLink[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [expiresIn, setExpiresIn] = React.useState("24");
  const [isCreating, setIsCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<{ items: ShareLink[] }>(
        `/api/documents/${documentId}/share-links`
      );
      setLinks(data.items);
    } catch {
      // ignore
    }
  }, [documentId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const hours = parseInt(expiresIn, 10);
      await apiPost(`/api/documents/${documentId}/share-links`, {
        expires_in_hours: hours,
      });
      await load();
      setDialogOpen(false);
      appToast.success("Lien de partage créé");
    } catch {
      appToast.error("Erreur lors de la création du lien");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiPost(
        `/api/documents/${documentId}/share-links/${id}/revoke`,
        {}
      );
      await load();
      appToast.success("Lien révoqué");
    } catch {
      appToast.error("Erreur");
    }
  };

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      appToast.success("Lien copié");
    });
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="size-4" />
          Liens de partage
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Créer un lien
        </Button>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Aucun lien actif. Créez un lien pour partager ce document en toute sécurité.
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const isExpiringSoon =
                new Date(link.expires_at).getTime() - Date.now() <
                60 * 60 * 1000;
              return (
                <div
                  key={link.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border border-border bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-foreground truncate max-w-[280px]">
                        {link.url}
                      </code>
                      <Badge
                        variant="outline"
                        className={
                          isExpiringSoon
                            ? "text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-800"
                            : "text-green-700 border-green-300 dark:text-green-400 dark:border-green-800"
                        }
                      >
                        <Clock className="size-3 mr-1" />
                        Expire {formatRelative(link.expires_at)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Créé par {link.created_by} ·{" "}
                      {formatDateTime(link.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleCopy(link.url)}
                      aria-label="Copier"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                      aria-label="Ouvrir"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => void handleRevoke(link.id)}
                      aria-label="Révoquer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un lien de partage signé</DialogTitle>
            <DialogDescription>
              Le lien sera utilisable jusqu'à expiration. Vous pouvez le révoquer à tout moment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="expires">Durée de validité</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 heures</SelectItem>
                  <SelectItem value="168">7 jours</SelectItem>
                  <SelectItem value="720">30 jours</SelectItem>
                  <SelectItem value="8760">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300">
              ⚠️ Toute personne disposant du lien pourra consulter ce document. Ne partagez que via des canaux sécurisés.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreate()} disabled={isCreating}>
              {isCreating ? "Création..." : "Générer le lien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
