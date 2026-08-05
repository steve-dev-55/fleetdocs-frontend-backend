

import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { ComplianceDot } from "@/components/vehicles/compliance-dot";
import { VEHICLE_STATUS } from "@/lib/status-config";
import { exportToCsv } from "@/lib/utils";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { useSavedViews, type SavedView } from "@/hooks/use-saved-views";
import { useColumnVisibility, type ColumnDef } from "@/hooks/use-column-visibility";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import {
  Search,
  Download,
  Archive,
  ChevronLeft,
  ChevronRight,
  Filter,
  Columns3,
  Star,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";

const VEHICLE_TYPE_OPTIONS = [
  { value: "all", label: "Tous les types" },
  { value: "Fourgon", label: "Fourgon" },
  { value: "Poids lourd", label: "Poids lourd" },
];

const COMPLIANCE_OPTIONS = [
  { value: "all", label: "Toutes conformités" },
  { value: "green", label: "Conformes" },
  { value: "orange", label: "À surveiller" },
  { value: "red", label: "Non conformes" },
];

const FILTER_BADGE_CLASSES: Record<string, string> = {
  green: "bg-accent-green/15 text-accent-green border border-accent-green/30",
  orange: "bg-accent-amber/15 text-accent-amber border border-accent-amber/30",
  red: "bg-accent-red/15 text-accent-red border border-accent-red/30",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const COLUMNS: ColumnDef[] = [
  { id: "compliance", label: "Conformité", defaultVisible: true },
  { id: "registration", label: "Immatriculation", defaultVisible: true },
  { id: "vehicle", label: "Véhicule", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "status", label: "Statut", defaultVisible: true },
  { id: "site", label: "Site", defaultVisible: true },
  { id: "driver", label: "Conducteur", defaultVisible: true },
];

interface VehicleFilters {
  search: string;
  status: string;
  type: string;
  compliance: string;
}

const EMPTY_FILTERS: VehicleFilters = {
  search: "",
  status: "all",
  type: "all",
  compliance: "all",
};

export function VehiclesTable() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [filters, setFilters] = React.useState<VehicleFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [activeView, setActiveView] = React.useState<SavedView | null>(null);
  const [saveViewOpen, setSaveViewOpen] = React.useState(false);
  const [newViewName, setNewViewName] = React.useState("");
  const [photoCache, setPhotoCache] = React.useState<Record<string, string>>({});

  const { views, addView, removeView } = useSavedViews();
  const { isVisible, toggle, columns } = useColumnVisibility("vehicles", COLUMNS);

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Sync search into filters
  const effectiveFilters = React.useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  // Fetch from API
  const fetchVehicles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (effectiveFilters.search) params.set("search", effectiveFilters.search);
      params.set("status", effectiveFilters.status);
      params.set("type", effectiveFilters.type);
      params.set("compliance", effectiveFilters.compliance);
      const data = await apiGet<
        | { items: Vehicle[]; total: number }
        | { vehicles?: Vehicle[]; total?: number }
        | Vehicle[]
      >(`/api/vehicles?${params.toString()}`);
      // Défensif : gère plusieurs formats possibles (tableau, {items}, {vehicles})
      const items: Vehicle[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.vehicles)
        ? (data as any).vehicles
        : [];
      const total = Array.isArray(data)
        ? data.length
        : (data as any)?.total ?? items.length;
      setVehicles(items);
      setTotalCount(total);
    } catch (err) {
      appToast.error("Erreur de chargement", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [effectiveFilters]);

  React.useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  // Fetch photos for the first page of vehicles
  React.useEffect(() => {
    for (const v of vehicles.slice(0, pageSize)) {
      if (photoCache[v.id]) continue;
      fetch(`/api/vehicles/${v.id}/photo`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { photo_url?: string | null } | null) => {
          if (data?.photo_url) {
            setPhotoCache((prev) => ({ ...prev, [v.id]: data.photo_url! }));
          }
        })
        .catch(() => {});
    }
  }, [vehicles, pageSize, photoCache]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(vehicles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = vehicles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const allChecked =
    paginated.length > 0 && paginated.every((v) => selected.has(v.id));
  const someChecked =
    paginated.some((v) => selected.has(v.id)) && !allChecked;

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((v) => v.id)));
    }
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
    const rows = vehicles.map((v) => ({
      registration: v.registration,
      brand: v.brand,
      model: v.model,
      type: v.type,
      ptac_kg: v.ptac_kg,
      year: v.year,
      vin: v.vin,
      // Défensif : le backend peut renvoyer des statuts (sold, archived) absents du dict frontend
      status: VEHICLE_STATUS[v.status]?.label ?? v.status,
      compliance: v.compliance,
      site: v.site ?? "",
      driver: v.driver ?? "",
      created_at: v.created_at?.split?.("T")?.[0] ?? "",
    }));
    exportToCsv(`vehicules-${new Date().toISOString().split("T")[0]}.csv`, rows, [
      { key: "registration", label: "Immatriculation" },
      { key: "brand", label: "Marque" },
      { key: "model", label: "Modèle" },
      { key: "type", label: "Type" },
      { key: "ptac_kg", label: "PTAC (kg)" },
      { key: "year", label: "Année" },
      { key: "vin", label: "VIN" },
      { key: "status", label: "Statut" },
      { key: "compliance", label: "Conformité" },
      { key: "site", label: "Site" },
      { key: "driver", label: "Conducteur" },
      { key: "created_at", label: "Créé le" },
    ]);
  };

  // Optimistic archive (mock — uses undo pattern)
  const { mutate: archiveVehicles, isPending: isArchiving } =
    useOptimisticMutation<Vehicle[], Set<string>>({
      getCurrent: () => vehicles,
      applyOptimistic: (curr, ids) => curr.filter((v) => !ids.has(v.id)),
      setState: setVehicles,
      mutate: async (ids) => {
        await apiPost("/api/analytics/track", {
          name: "vehicles.archive",
          properties: { count: ids.size },
        });
      },
    });

  const handleArchive = () => {
    const ids = new Set(selected);
    if (ids.size === 0) return;
    void archiveVehicles(ids);
    appToast.withUndo(
      `${ids.size} véhicule(s) archivé(s)`,
      () => {
        // Undo: refetch
        void fetchVehicles();
      },
      { description: "Cliquez sur Annuler pour restaurer." }
    );
    setSelected(new Set());
  };

  const applyView = (view: SavedView) => {
    setActiveView(view);
    setFilters(view.filters);
    setSearch(view.filters.search);
    setPage(1);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    const view = addView(newViewName.trim(), {
      ...filters,
      search: debouncedSearch,
    });
    setActiveView(view);
    setNewViewName("");
    setSaveViewOpen(false);
    appToast.success(`Vue « ${view.name} » enregistrée`);
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.compliance !== "all" ||
    debouncedSearch !== "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par immatriculation, marque, VIN..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* P2-1: Saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="size-4" />
                <span className="hidden sm:inline">
                  {activeView ? activeView.name : "Vues"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Vues sauvegardées</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {views.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => applyView(v)}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <Star className="size-3.5 text-amber-500" />
                    {v.name}
                  </span>
                  {!v.isDefault && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeView(v.id);
                      }}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSaveViewOpen(true)}
                disabled={!hasActiveFilters}
              >
                <Plus className="size-4" />
                Créer une vue…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select
            value={filters.status}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, status: v }))
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {(Object.keys(VEHICLE_STATUS) as VehicleStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {VEHICLE_STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.type}
            onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.compliance}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, compliance: v }))
            }
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Conformité" />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* P2-2: Column visibility toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Columns3 className="size-4" />
                      <span className="sr-only">Colonnes</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visibilité des colonnes</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer"
                  onClick={() => toggle(c.id)}
                >
                  <Checkbox checked={isVisible(c.id)} className="mr-2" />
                  <span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selected.size}</span> véhicule(s)
            sélectionné(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={isArchiving}
            >
              <Archive className="size-4" />
              Archiver
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              Exporter
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

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={
                      allChecked ? true : someChecked ? "indeterminate" : false
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                {isVisible("compliance") && (
                  <TableHead className="w-12">Conf.</TableHead>
                )}
                {isVisible("registration") && (
                  <TableHead>Immatriculation</TableHead>
                )}
                {isVisible("vehicle") && <TableHead>Véhicule</TableHead>}
                {isVisible("type") && (
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                )}
                {isVisible("status") && (
                  <TableHead className="hidden md:table-cell">Statut</TableHead>
                )}
                {isVisible("site") && (
                  <TableHead className="hidden lg:table-cell">Site</TableHead>
                )}
                {isVisible("driver") && (
                  <TableHead className="hidden lg:table-cell">Conducteur</TableHead>
                )}
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={9} className="py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Filter className="size-6 mx-auto mb-2 opacity-50" />
                    Aucun véhicule ne correspond à vos critères.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((v) => {
                  const photo = photoCache[v.id];
                  return (
                    <TableRow
                      key={v.id}
                      data-state={selected.has(v.id) ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                    >
                      <TableCell
                        className="pl-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected.has(v.id)}
                          onCheckedChange={() => toggleOne(v.id)}
                          aria-label={`Sélectionner ${v.registration}`}
                        />
                      </TableCell>
                      {isVisible("compliance") && (
                        <TableCell>
                          <ComplianceDot
                            level={v.compliance ?? "green"}
                            detail={v.compliance_detail}
                          />
                        </TableCell>
                      )}
                      {isVisible("registration") && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {photo ? (
                              <Avatar className="size-8 rounded-md shrink-0">
                                <AvatarFallback
                                  className="rounded-md"
                                  style={{
                                    backgroundImage: `url(${photo})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                  }}
                                />
                              </Avatar>
                            ) : (
                              <div className="size-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                                <Truck className="size-4" />
                              </div>
                            )}
                            <span className="font-mono font-medium">
                              {v.registration}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {isVisible("vehicle") && (
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {v.brand} {v.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {v.year} · {v.fuel_type}
                          </div>
                        </TableCell>
                      )}
                      {isVisible("type") && (
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {v.type}
                        </TableCell>
                      )}
                      {isVisible("status") && (
                        <TableCell className="hidden md:table-cell">
                          <VehicleStatusBadge status={v.status} />
                        </TableCell>
                      )}
                      {isVisible("site") && (
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {v.site ?? "—"}
                        </TableCell>
                      )}
                      {isVisible("driver") && (
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {v.driver ?? "—"}
                        </TableCell>
                      )}
                      <TableCell
                        className="text-right pr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                        >
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination footer with page size selector (P2-3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <p>
            {vehicles.length} véhicule(s) sur {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <span>Lignes par page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[72px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Précédent
          </Button>
          <span className="px-2">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Save view dialog */}
      <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une vue</DialogTitle>
            <DialogDescription>
              Donnez un nom à cette combinaison de filtres pour la retrouver
              rapidement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="view-name">Nom de la vue</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Ex : Véhicules Lyon en panne"
                autoFocus
              />
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Filtres actuels :</strong>
              </p>
              <p>Recherche : {debouncedSearch || "—"}</p>
              <p>
                Statut :{" "}
                {filters.status === "all"
                  ? "Tous"
                  : VEHICLE_STATUS[filters.status as VehicleStatus]?.label}
              </p>
              <p>Type : {filters.type === "all" ? "Tous" : filters.type}</p>
              <p>
                Conformité :{" "}
                {COMPLIANCE_OPTIONS.find((o) => o.value === filters.compliance)
                  ?.label ?? "Toutes"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveViewOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveView} disabled={!newViewName.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
