

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Truck,
  FileText,
  Bell,
  Settings,
  Plus,
  Upload,
  UserPlus,
  Search as SearchIcon,
  QrCode,
  Share2,
  Star,
  Keyboard,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { apiGet, getErrorMessage } from "@/lib/api-client";
import type { Vehicle, FleetDocument, Alert } from "@/lib/types";
import { VEHICLE_STATUS, OCR_STATUS, ALERT_TYPES } from "@/lib/status-config";

const CommandPaletteContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function useCommandPalette() {
  return React.useContext(CommandPaletteContext);
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteInner />
    </CommandPaletteContext.Provider>
  );
}

function CommandPaletteInner() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [documents, setDocuments] = React.useState<FleetDocument[]>([]);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    void Promise.all([
      apiGet<{ items: Vehicle[] }>("/api/vehicles"),
      apiGet<{ items: FleetDocument[] }>("/api/documents"),
      apiGet<{ items: Alert[] }>("/api/alerts"),
    ]).then(([v, d, a]) => {
      setVehicles(v.items.slice(0, 5));
      setDocuments(d.items.slice(0, 5));
      setAlerts(a.items.slice(0, 5));
    });
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const filteredVehicles = query
    ? vehicles.filter(
        (v) =>
          v.registration.toLowerCase().includes(query.toLowerCase()) ||
          `${v.brand} ${v.model}`.toLowerCase().includes(query.toLowerCase())
      )
    : vehicles;
  const filteredDocuments = query
    ? documents.filter((d) =>
        d.file_name.toLowerCase().includes(query.toLowerCase())
      )
    : documents;
  const filteredAlerts = query
    ? alerts.filter((a) =>
        ALERT_TYPES[a.type].toLowerCase().includes(query.toLowerCase())
      )
    : alerts;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher ou exécuter une commande..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Tableau de bord
            <kbd className="ml-auto text-xs text-muted-foreground">g d</kbd>
          </CommandItem>
          <CommandItem onSelect={() => go("/vehicles")}>
            <Truck className="size-4" />
            Véhicules
            <kbd className="ml-auto text-xs text-muted-foreground">g v</kbd>
          </CommandItem>
          <CommandItem onSelect={() => go("/documents")}>
            <FileText className="size-4" />
            Documents
            <kbd className="ml-auto text-xs text-muted-foreground">g D</kbd>
          </CommandItem>
          <CommandItem onSelect={() => go("/alerts")}>
            <Bell className="size-4" />
            Alertes
            <kbd className="ml-auto text-xs text-muted-foreground">g a</kbd>
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="size-4" />
            Paramètres
            <kbd className="ml-auto text-xs text-muted-foreground">g s</kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/vehicles/new")}>
            <Plus className="size-4" />
            Créer un véhicule
          </CommandItem>
          <CommandItem onSelect={() => go("/documents")}>
            <Upload className="size-4" />
            Uploader un document
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <UserPlus className="size-4" />
            Inviter un utilisateur
          </CommandItem>
          <CommandItem onSelect={() => go("/vehicles")}>
            <Star className="size-4" />
            Vues sauvegardées
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
            }}
          >
            <Keyboard className="size-4" />
            Raccourcis clavier
            <kbd className="ml-auto text-xs text-muted-foreground">?</kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Administration">
          <CommandItem onSelect={() => go("/admin/audit-logs")}>
            <ShieldCheck className="size-4" />
            Journal d'audit
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/experiments")}>
            <FlaskConical className="size-4" />
            Expériences A/B
          </CommandItem>
        </CommandGroup>

        {filteredVehicles.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Véhicules">
              {filteredVehicles.map((v) => (
                <CommandItem
                  key={v.id}
                  onSelect={() => go(`/vehicles/${v.id}`)}
                  value={`veh ${v.registration} ${v.brand} ${v.model}`}
                >
                  <Truck className="size-4" />
                  <span className="font-mono">{v.registration}</span>
                  <span className="text-muted-foreground">
                    {v.brand} {v.model}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {VEHICLE_STATUS[v.status].label}
                  </span>
                </CommandItem>
              ))}
              <CommandItem onSelect={() => go("/vehicles")}>
                <QrCode className="size-4" />
                <span className="text-muted-foreground">
                  QR Code véhicule…
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {filteredDocuments.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {filteredDocuments.map((d) => (
                <CommandItem
                  key={d.id}
                  onSelect={() => go(`/documents/${d.id}`)}
                  value={`doc ${d.file_name} ${d.type}`}
                >
                  <FileText className="size-4" />
                  <span className="truncate">{d.file_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {OCR_STATUS[d.ocr_status].label}
                  </span>
                </CommandItem>
              ))}
              <CommandItem onSelect={() => go("/documents")}>
                <Share2 className="size-4" />
                <span className="text-muted-foreground">
                  Partager un document…
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {filteredAlerts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Alertes">
              {filteredAlerts.map((a) => (
                <CommandItem
                  key={a.id}
                  onSelect={() => go("/alerts")}
                  value={`alert ${ALERT_TYPES[a.type]} ${a.vehicle_registration ?? ""}`}
                >
                  <Bell className="size-4" />
                  <span>{ALERT_TYPES[a.type]}</span>
                  {a.vehicle_registration && (
                    <span className="text-muted-foreground font-mono">
                      {a.vehicle_registration}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Recherche globale">
          <CommandItem
            onSelect={() =>
              go(
                query
                  ? `/search?q=${encodeURIComponent(query)}`
                  : "/search"
              )
            }
          >
            <SearchIcon className="size-4" />
            {query
              ? `Voir tous les résultats pour « ${query} »`
              : "Page de recherche"}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
