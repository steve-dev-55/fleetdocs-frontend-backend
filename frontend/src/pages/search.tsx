import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, FileText, Bell, SearchX, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import {
  VEHICLE_STATUS,
  ALERT_TYPES,
} from "@/lib/status-config";
import type { Vehicle, FleetDocument, Alert } from "@/lib/types";

interface SearchResponse {
  vehicles: Vehicle[];
  documents: FleetDocument[];
  alerts: Alert[];
  total: number;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [data, setData] = React.useState<SearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!q) {
      setData(null);
      return;
    }
    setLoading(true);
    apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
      .then(setData)
      .catch(() => setData({ vehicles: [], documents: [], alerts: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [q]);

  const vehicles = data?.vehicles ?? [];
  const documents = data?.documents ?? [];
  const alerts = data?.alerts ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Recherche
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {q ? (
            <>
              {loading ? "Recherche en cours…" : `${total} résultat(s) pour « `}
              <span className="font-semibold text-foreground">{q}</span>
              {loading ? "" : " »"}
            </>
          ) : (
            "Saisissez une recherche dans la barre en haut."
          )}
        </p>
      </div>

      {!q && (
        <Card className="rounded-xl border-dashed">
          <CardContent className="py-12 text-center">
            <SearchX className="size-10 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Utilisez la barre de recherche dans l'en-tête pour trouver un
              véhicule, un document ou une alerte.
            </p>
          </CardContent>
        </Card>
      )}

      {q && loading && (
        <Card className="rounded-xl border-dashed">
          <CardContent className="py-12 text-center">
            <Loader2 className="size-8 mx-auto animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {q && !loading && total === 0 && (
        <Card className="rounded-xl border-dashed">
          <CardContent className="py-12 text-center">
            <SearchX className="size-10 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucun résultat trouvé pour « {q} ».
            </p>
          </CardContent>
        </Card>
      )}

      {vehicles.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Véhicules ({vehicles.length})
          </h2>
          <div className="space-y-2">
            {vehicles.map((v) => (
              <Link
                key={v.id}
                to={`/vehicles/${v.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="size-9 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                  <Truck className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono font-medium text-foreground">
                    {v.registration}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.brand} {v.model} · {v.type} · {VEHICLE_STATUS[v.status].label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Documents ({documents.length})
          </h2>
          <div className="space-y-2">
            {documents.map((d) => (
              <Link
                key={d.id}
                to={`/documents/${d.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="size-9 rounded-md bg-green-50 dark:bg-green-950/40 text-green-600 flex items-center justify-center shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.file_name} ·{" "}
                    <span className="font-mono">{d.vehicle_registration}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {"—"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Alertes ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.id}
                to="/alerts"
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="size-9 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {ALERT_TYPES[a.type]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.message}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

