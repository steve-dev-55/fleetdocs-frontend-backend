

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api-client";
import { formatDateTime, formatRelative } from "@/lib/utils";
import {
  FileText,
  RefreshCw,
  Bell,
  Sparkles,
  Camera,
  Settings,
  MessageSquare,
  Plus,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyVehiclesIllustration } from "@/components/illustrations/empty-states";

interface TimelineEvent {
  id: string;
  type: "document" | "status" | "alert" | "ocr" | "comment" | "photo" | "custom";
  label: string;
  description?: string;
  timestamp: string;
  user?: string;
}

const TYPE_ICONS: Record<TimelineEvent["type"], React.ElementType> = {
  document: FileText,
  status: RefreshCw,
  alert: Bell,
  ocr: Sparkles,
  comment: MessageSquare,
  photo: Camera,
  custom: Settings,
};

const TYPE_COLORS: Record<TimelineEvent["type"], string> = {
  document: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  status: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  alert: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  ocr: "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
  comment: "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  photo: "bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
  custom: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const TYPE_LABELS: Record<string, string> = {
  all: "Tous les événements",
  document: "Documents",
  status: "Statuts",
  alert: "Alertes",
  ocr: "OCR",
  comment: "Commentaires",
  photo: "Photos",
  custom: "Autres",
};

export function VehicleTimeline({ vehicleId }: { vehicleId: string }) {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [filter, setFilter] = React.useState<string>("all");
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      const data = await apiGet<TimelineEvent[] | { items?: TimelineEvent[] }>(
        `/api/vehicles/${vehicleId}/timeline?${params.toString()}`
      );
      setEvents(Array.isArray(data) ? data : (data?.items ?? []));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Activité</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-8">
            <Filter className="size-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : events.length === 0 ? (
          <div className="py-8">
            <EmptyVehiclesIllustration />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Aucune activité pour ce véhicule.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
            <ol className="space-y-4">
              {events.map((ev) => {
                const Icon = TYPE_ICONS[ev.type] ?? Plus;
                return (
                  <li key={ev.id} className="relative flex gap-4 pl-0">
                    <div
                      className={`relative z-10 size-7 rounded-full flex items-center justify-center shrink-0 ${TYPE_COLORS[ev.type]}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {ev.label}
                        </p>
                        <time
                          className="text-xs text-muted-foreground shrink-0"
                          dateTime={ev.timestamp}
                          title={formatDateTime(ev.timestamp)}
                        >
                          {formatRelative(ev.timestamp)}
                        </time>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ev.description}
                        </p>
                      )}
                      {ev.user && (
                        <p className="text-xs text-muted-foreground mt-1">
                          par {ev.user}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
