


import * as React from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/shared/status-badge";
import { ALERT_TYPES, ALERT_SEVERITY } from "@/lib/status-config";
import { exportToCsv, formatDateTime, formatRelative } from "@/lib/utils";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { notifyAlertsChanged } from "@/lib/alert-bus";
import type { AlertType, AlertStatus, Alert } from "@/lib/types";
import {
  Search,
  Download,
  Check,
  Bell,
  Filter,
  Archive,
} from "lucide-react";

const STATUS_OPTIONS: { value: AlertStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actives" },
  { value: "acknowledged", label: "Prises en compte" },
  { value: "resolved", label: "Résolues" },
];

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Toutes les sévérités" },
  { value: "critical", label: "Critique" },
  { value: "warning", label: "Avertissement" },
  { value: "info", label: "Info" },
];

const FILTER_BADGE_CLASSES: Record<string, string> = {
  critical: "bg-accent-red/15 text-accent-red border border-accent-red/30",
  warning: "bg-accent-amber/15 text-accent-amber border border-accent-amber/30",
  info: "bg-accent-teal/15 text-accent-teal border border-accent-teal/30",
};

export function AlertsTable() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("active");
  const [severityFilter, setSeverityFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [allAlerts, setAllAlerts] = React.useState<Alert[]>([]);

  const fetchAlerts = React.useCallback(async () => {
    try {
      const data = await apiGet<
        | { items: Alert[] }
        | { alerts?: Alert[] }
        | Alert[]
      >("/api/alerts?status=all");
      // Défensif : gère plusieurs formats (tableau, {items}, {alerts})
      const items: Alert[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.alerts)
        ? (data as any).alerts
        : [];
      setAllAlerts(items);
    } catch (err) {
      appToast.error("Erreur de chargement", {
        description: getErrorMessage(err),
      });
    }
  }, []);

  React.useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return allAlerts.filter((a) => {
      // Défensif : ignorer les alertes malformées
      if (!a || !a.type || !a.message) return false;
      const typeLabel = ALERT_TYPES[a.type] ?? a.type ?? "";
      if (
        q &&
        !typeLabel.toLowerCase().includes(q) &&
        !(a.vehicle_registration ?? "").toLowerCase().includes(q) &&
        !(a.message ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      return true;
    });
  }, [allAlerts, debouncedSearch, statusFilter, severityFilter]);

  const allChecked =
    filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const someChecked =
    filtered.some((a) => selected.has(a.id)) && !allChecked;

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    exportToCsv(
      `alertes-${new Date().toISOString().split("T")[0]}.csv`,
      filtered.map((a) => ({
        type: ALERT_TYPES[a.type] ?? a.type,
        severity: a.severity,
        vehicle_registration: a.vehicle_registration ?? "",
        document_type: a.document_type ?? "",
        message: a.message,
        triggered_at: a.triggered_at,
        due_date: a.due_date ?? "",
        status: a.status,
      })),
      [
        { key: "type", label: "Type" },
        { key: "severity", label: "Sévérité" },
        { key: "vehicle_registration", label: "Immatriculation" },
        { key: "document_type", label: "Type de document" },
        { key: "message", label: "Message" },
        { key: "triggered_at", label: "Déclenchée le" },
        { key: "due_date", label: "Échéance" },
        { key: "status", label: "Statut" },
      ]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par type, véhicule, message..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleExport}>
                  <Download className="size-4" />
                  <span className="sr-only">Exporter CSV</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exporter en CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selected.size}</span> alerte(s)
            sélectionnée(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Check className="size-4" />
              Marquer lue
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="size-4" />
              Archiver
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Véhicule</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="hidden md:table-cell">Déclenchée</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Filter className="size-6 mx-auto mb-2 opacity-50" />
                    Aucune alerte ne correspond à vos critères.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => {
                  // Défensif : fallbacks si type inconnu du dictionnaire
                  const sev =
                    ALERT_SEVERITY[a.type] ??
                    ({ severity: "warning" as const, color: "gray" as const });
                  const typeLabel = ALERT_TYPES[a.type] ?? a.type ?? "Alerte";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selected.has(a.id)}
                          onCheckedChange={() => toggleOne(a.id)}
                          aria-label="Sélectionner"
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={typeLabel}
                          color={sev.color}
                          withDot
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {a.vehicle_registration ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-foreground line-clamp-2">
                          {a.message}
                        </p>
                        {a.document_type && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📄 {a.document_type}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">{formatRelative(a.triggered_at)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(a.triggered_at)}
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={a.status === "resolved"}
                                onClick={() => {
                                  void apiPost(`/api/alerts/${a.id}/resolve`, {})
                                    .then(() => {
                                      appToast.success("Alerte résolue");
                                      void fetchAlerts();
                                      // Notify sidebar, header & alerts page to refresh their counts
                                      notifyAlertsChanged();
                                    })
                                    .catch((err) => {
                                      appToast.error("Erreur", {
                                        description:
                                          err instanceof Error
                                            ? err.message
                                            : undefined,
                                      });
                                    });
                                }}
                              >
                                <Check className="size-4" />
                                <span className="sr-only">Marquer comme résolue</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marquer comme résolue</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {filtered.length} alerte(s) sur {allAlerts.length}
        </p>
      </div>
    </div>
  );
}
