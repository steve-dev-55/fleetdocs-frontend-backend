

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import {
  Mail,
  Bell,
  Smartphone,
  Calendar,
  Slack,
  MessageSquare,
  Check,
  Eye,
} from "lucide-react";

interface Pref {
  id: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

const initialPrefs: Pref[] = [
  {
    id: "expiring_90",
    label: "Expire dans 90 jours",
    description: "Notification J-90 pour les documents qui expirent.",
    email: true,
    inApp: true,
  },
  {
    id: "expiring_30",
    label: "Expire dans 30 jours",
    description: "Notification J-30 — début de la zone d'alerte.",
    email: true,
    inApp: true,
  },
  {
    id: "expiring_7",
    label: "Expire dans 7 jours",
    description: "Notification J-7 — dernière chance pour agir.",
    email: true,
    inApp: true,
  },
  {
    id: "expired",
    label: "Document expiré",
    description: "Notification critique — action immédiate requise.",
    email: true,
    inApp: true,
  },
  {
    id: "vehicle_broken",
    label: "Véhicule en panne",
    description: "Quand un véhicule est signalé en panne.",
    email: true,
    inApp: true,
  },
];

interface ScheduledReport {
  weekly: boolean;
  monthly: boolean;
  format: "pdf" | "excel";
  email: string;
}

interface Integration {
  slack: { connected: boolean; workspace?: string; channel?: string; alert_types: string[] };
  teams: { connected: boolean; workspace?: string; channel?: string; alert_types: string[] };
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  expired: "Document expiré",
  expiring_30: "Expire dans 30 jours",
  vehicle_broken: "Véhicule en panne",
  
};

export function NotificationsPanel() {
  const [prefs, setPrefs] = React.useState<Pref[]>(initialPrefs);
  const [emailFrequency, setEmailFrequency] = React.useState("instant");
  const [scheduled, setScheduled] = React.useState<ScheduledReport>({
    weekly: true,
    monthly: false,
    format: "pdf",
    email: "marie.dupont@transport-dupont.fr",
  });
  const [integration, setIntegration] = React.useState<Integration>({
    slack: { connected: false, alert_types: ["expired", "vehicle_broken"] },
    teams: { connected: false, alert_types: ["expired"] },
  });
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<{
        scheduled_report?: ScheduledReport;
        integrations?: Integration;
      }>("/api/settings/notifications");
      // Défensif : l'API peut ne pas renvoyer scheduled_report/integrations
      setScheduled((prev) => ({ ...prev, ...(data.scheduled_report ?? {}) }));
      setIntegration((prev) => ({ ...prev, ...(data.integrations ?? {}) }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const update = (id: string, channel: "email" | "inApp", value: boolean) => {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [channel]: value } : p))
    );
  };

  const saveScheduled = async (next: Partial<ScheduledReport>) => {
    const updated = { ...scheduled, ...next };
    setScheduled(updated);
    try {
      await apiPut("/api/settings/notifications", {
        scheduled_report: updated,
      });
      appToast.success("Rapports programmés mis à jour");
    } catch {
      appToast.error("Erreur");
    }
  };

  const connectSlack = async () => {
    // Mock OAuth flow
    appToast.info("Connexion à Slack en cours...");
    setTimeout(async () => {
      const updated: Integration = {
        ...integration,
        slack: {
          ...integration.slack,
          connected: true,
          workspace: "Transport Dupont",
          channel: "#alerts",
        },
      };
      setIntegration(updated);
      try {
        await apiPut("/api/settings/notifications", { integrations: updated });
        appToast.success("Slack connecté", {
          description: "Workspace : Transport Dupont · #alerts",
        });
      } catch {
        appToast.error("Erreur");
      }
    }, 1500);
  };

  const connectTeams = async () => {
    appToast.info("Connexion à Microsoft Teams en cours...");
    setTimeout(async () => {
      const updated: Integration = {
        ...integration,
        teams: {
          ...integration.teams,
          connected: true,
          workspace: "Transport Dupont",
          channel: "Alertes",
        },
      };
      setIntegration(updated);
      try {
        await apiPut("/api/settings/notifications", { integrations: updated });
        appToast.success("Teams connecté");
      } catch {
        appToast.error("Erreur");
      }
    }, 1500);
  };

  const disconnect = async (
    provider: "slack" | "teams"
  ) => {
    const updated: Integration = {
      ...integration,
      [provider]: { ...integration[provider], connected: false, workspace: undefined, channel: undefined },
    };
    setIntegration(updated);
    try {
      await apiPut("/api/settings/notifications", { integrations: updated });
      appToast.success(`${provider === "slack" ? "Slack" : "Teams"} déconnecté`);
    } catch {
      appToast.error("Erreur");
    }
  };

  const toggleAlertType = async (
    provider: "slack" | "teams",
    alertType: string
  ) => {
    const current = integration[provider].alert_types;
    const next = current.includes(alertType)
      ? current.filter((t) => t !== alertType)
      : [...current, alertType];
    const updated: Integration = {
      ...integration,
      [provider]: { ...integration[provider], alert_types: next },
    };
    setIntegration(updated);
    try {
      await apiPut("/api/settings/notifications", { integrations: updated });
    } catch {
      appToast.error("Erreur");
    }
  };

  return (
    <div className="space-y-6">
      {/* Email preferences */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="size-4" />
            Préférences email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="freq">Fréquence des emails</Label>
            <select
              id="freq"
              value={emailFrequency}
              onChange={(e) => setEmailFrequency(e.target.value)}
              className="mt-1.5 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="instant">Instantanée (dès qu'une alerte est déclenchée)</option>
              <option value="daily">Quotidienne (résumé à 8h)</option>
              <option value="weekly">Hebdomadaire (résumé le lundi)</option>
              <option value="disabled">Désactivée</option>
            </select>
          </div>
          <div>
            <Label htmlFor="digest">Email de résumé</Label>
            <Input
              id="digest"
              type="email"
              defaultValue="marie.dupont@transport-dupont.fr"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tous les emails seront envoyés à cette adresse.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert type preferences */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4" />
            Notifications par type d'alerte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {prefs.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {p.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 text-sm">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground hidden sm:inline">Email</span>
                    <Switch
                      checked={p.email}
                      onCheckedChange={(v) => update(p.id, "email", v)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Smartphone className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground hidden sm:inline">In-app</span>
                    <Switch
                      checked={p.inApp}
                      onCheckedChange={(v) => update(p.id, "inApp", v)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={() =>
                appToast.success("Préférences enregistrées", {
                  description: "Vos notifications ont été mises à jour.",
                })
              }
            >
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* P2-13: Scheduled reports */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="size-4" />
            Rapports programmés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Rapport hebdomadaire
              </p>
              <p className="text-xs text-muted-foreground">
                Synthèse de la conformité tous les lundis à 8h
              </p>
            </div>
            <Switch
              checked={scheduled.weekly}
              onCheckedChange={(v) => void saveScheduled({ weekly: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Rapport mensuel
              </p>
              <p className="text-xs text-muted-foreground">
                Bilan complet le 1er de chaque mois à 8h
              </p>
            </div>
            <Switch
              checked={scheduled.monthly}
              onCheckedChange={(v) => void saveScheduled({ monthly: v })}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-3 border-t border-border">
            <div className="flex-1">
              <Label htmlFor="report-format">Format du rapport</Label>
              <Select
                value={scheduled.format}
                onValueChange={(v: "pdf" | "excel") =>
                  void saveScheduled({ format: v })
                }
              >
                <SelectTrigger id="report-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel (CSV)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="report-email">Destinataire</Label>
              <Input
                id="report-email"
                type="email"
                value={scheduled.email}
                onChange={(e) =>
                  setScheduled({ ...scheduled, email: e.target.value })
                }
              />
            </div>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              Aperçu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* P2-15: Slack / Teams integrations */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4" />
            Intégrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Slack */}
          <div className="p-3 rounded-md border border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 flex items-center justify-center">
                  <Slack className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Slack</p>
                  {integration.slack.connected ? (
                    <p className="text-xs text-muted-foreground">
                      {integration.slack.workspace} · {integration.slack.channel}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Non connecté</p>
                  )}
                </div>
              </div>
              {integration.slack.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void disconnect("slack")}
                >
                  Déconnecter
                </Button>
              ) : (
                <Button size="sm" onClick={() => void connectSlack()}>
                  Connecter Slack
                </Button>
              )}
            </div>
            {integration.slack.connected && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-foreground mb-2">
                  Types d'alertes à envoyer :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ALERT_TYPE_LABELS).map(([type, label]) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <Switch
                        checked={integration.slack.alert_types.includes(type)}
                        onCheckedChange={() => void toggleAlertType("slack", type)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="p-3 rounded-md border border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center">
                  <MicrosoftTeamsIcon />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Microsoft Teams
                  </p>
                  {integration.teams.connected ? (
                    <p className="text-xs text-muted-foreground">
                      {integration.teams.workspace} · {integration.teams.channel}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Non connecté</p>
                  )}
                </div>
              </div>
              {integration.teams.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void disconnect("teams")}
                >
                  Déconnecter
                </Button>
              ) : (
                <Button size="sm" onClick={() => void connectTeams()}>
                  Connecter Teams
                </Button>
              )}
            </div>
            {integration.teams.connected && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-foreground mb-2">
                  Types d'alertes à envoyer :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ALERT_TYPE_LABELS).map(([type, label]) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <Switch
                        checked={integration.teams.alert_types.includes(type)}
                        onCheckedChange={() => void toggleAlertType("teams", type)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email preview dialog */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Aperçu du rapport</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
                Fermer
              </Button>
            </div>
            <div className="p-6 bg-muted/30">
              <div className="bg-white rounded-md border border-border p-6 max-w-md mx-auto">
                <div className="text-center pb-4 border-b border-border">
                  <div className="size-10 mx-auto rounded-md bg-primary text-primary-foreground font-bold flex items-center justify-center">
                    F
                  </div>
                  <p className="mt-2 font-semibold text-foreground">
                    Rapport Hebdomadaire
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Transport Dupont SAS · {new Date().toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="py-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Véhicules</span>
                    <span className="font-semibold">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conformité</span>
                    <Badge className="bg-green-100 text-green-700">87%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alertes actives</span>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-semibold">25</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                  <p>⚠️ 2 documents expirés à traiter</p>
                  <p>⚠️ 1 véhicule en panne</p>
                </div>
                <div className="mt-4 text-center">
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-xs rounded-md">
                    Voir le détail
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MicrosoftTeamsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5">
      <rect x="3" y="3" width="13" height="18" fill="#5059C9" rx="2" />
      <rect x="6" y="6" width="7" height="3" fill="#fff" />
      <circle cx="16" cy="8" r="3" fill="#7B83EB" />
      <rect x="14" y="11" width="6" height="7" fill="#7B83EB" rx="2" />
    </svg>
  );
}
