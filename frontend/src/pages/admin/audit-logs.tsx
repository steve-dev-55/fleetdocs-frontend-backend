

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/lib/api-client";
import { exportToCsv, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Download,
  Filter,
  Search,
  Loader2,
  Lock,
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  user_email?: string;
  action: string;
  category: "auth" | "vehicle" | "document" | "alert" | "settings" | "user";
  resource: string;
  ip: string;
  details?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Authentification",
  vehicle: "Véhicule",
  document: "Document",
  alert: "Alerte",
  settings: "Paramètres",
  user: "Utilisateur",
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  vehicle: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  document: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  alert: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  settings: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  user: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
};

export default function AuditLogsPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [filtered, setFiltered] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userFilter, setUserFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (isLoading) return;
    if (user?.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    void apiGet<{ items: AuditLog[] } | AuditLog[]>("/api/audit-logs")
      .then((data) => {
        const items = Array.isArray(data) ? data : data.items ?? [];
        setLogs(items);
        setFiltered(items);
      })
      .finally(() => setLoading(false));
  }, [user, isLoading, navigate]);

  React.useEffect(() => {
    let list = logs;
    if (userFilter !== "all")
      list = list.filter((l) =>
        l.user.toLowerCase().includes(userFilter.toLowerCase())
      );
    if (actionFilter !== "all")
      list = list.filter((l) => l.action === actionFilter);
    if (categoryFilter !== "all")
      list = list.filter((l) => l.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.user.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q) ||
          (l.details ?? "").toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [logs, userFilter, actionFilter, categoryFilter, search]);

  const handleExport = () => {
    exportToCsv(
      `audit-logs-${new Date().toISOString().split("T")[0]}.csv`,
      filtered.map((l) => ({
        timestamp: formatDateTime(l.timestamp),
        user: l.user,
        email: l.user_email ?? "",
        action: l.action,
        category: l.category,
        resource: l.resource,
        ip: l.ip,
        details: l.details ?? "",
      })),
      [
        { key: "timestamp", label: "Horodatage" },
        { key: "user", label: "Utilisateur" },
        { key: "email", label: "Email" },
        { key: "action", label: "Action" },
        { key: "category", label: "Catégorie" },
        { key: "resource", label: "Ressource" },
        { key: "ip", label: "IP" },
        { key: "details", label: "Détails" },
      ]
    );
  };

  const uniqueActions = React.useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))),
    [logs]
  );

  if (isLoading || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="size-6" />
            Journal d'audit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} entrée(s) · Traçabilité complète des actions.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="size-4" />
          Exporter CSV
        </Button>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9"
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Utilisateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                {Array.from(new Set(logs.map((l) => l.user))).map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Horodatage</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                  <TableHead className="hidden md:table-cell">Ressource</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                  <TableHead className="pr-6">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Aucune entrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 100).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="pl-6 text-xs text-muted-foreground font-mono">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">
                          {log.user}
                        </div>
                        {log.user_email && (
                          <div className="text-xs text-muted-foreground">
                            {log.user_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono text-foreground">
                          {log.action}
                        </code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[log.category]}`}
                        >
                          {CATEGORY_LABELS[log.category]}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                        {log.resource}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                        {log.ip}
                      </TableCell>
                      <TableCell className="pr-6 text-xs text-muted-foreground">
                        {log.details ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filtered.length > 100 && (
        <p className="text-xs text-center text-muted-foreground">
          Affichage des 100 premières entrées sur {filtered.length}. Affinez vos filtres ou exportez pour tout voir.
        </p>
      )}
    </div>
  );
}
