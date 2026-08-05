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
import { UploadDialog } from "@/components/documents/upload-dialog";
import {
  OCR_STATUS,
  DOCUMENT_VALIDITY,
} from "@/lib/status-config";
import { exportToCsv, formatDate, formatFileSize, formatRelative, normalizeDocuments } from "@/lib/utils";
import { apiGet } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import type { OcrStatus, DocumentValidity, FleetDocument } from "@/lib/types";
import {
  Search,
  Download,
  Archive,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

const OCR_OPTIONS = [
  { value: "all", label: "Tous les statuts OCR" },
  ...((Object.keys(OCR_STATUS) as OcrStatus[]).map((k) => ({
    value: k,
    label: OCR_STATUS[k].label,
  }))),
];

const VALIDITY_OPTIONS = [
  { value: "all", label: "Toutes validités" },
  ...((Object.keys(DOCUMENT_VALIDITY) as DocumentValidity[]).map((k) => ({
    value: k,
    label: DOCUMENT_VALIDITY[k].label,
  }))),
];

export function DocumentsTable() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [ocrFilter, setOcrFilter] = React.useState<string>("all");
  const [validityFilter, setValidityFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [allDocuments, setAllDocuments] = React.useState<FleetDocument[]>([]);

  // Fetch documents on mount
  React.useEffect(() => {
    void apiGet("/api/documents")
      .then((d) => {
        // Normalise validity_status → validity, file_size → size, etc.
        setAllDocuments(normalizeDocuments(d) as unknown as FleetDocument[]);
      })
      .catch((err) => {
        appToast.error("Erreur de chargement", {
          description: err instanceof Error ? err.message : undefined,
        });
      });
  }, []);

  // P0-7: 300ms debounce
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return allDocuments.filter((d) => {
      // Défensif : ignorer les documents malformés
      if (!d || !d.id) return false;
      if (
        q &&
        !(d.file_name ?? "").toLowerCase().includes(q) &&
        !(d.type ?? "").toLowerCase().includes(q) &&
        !(d.vehicle_registration ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (ocrFilter !== "all" && d.ocr_status !== ocrFilter) return false;
      if (validityFilter !== "all" && d.validity !== validityFilter) return false;
      return true;
    });
  }, [allDocuments, debouncedSearch, ocrFilter, validityFilter]);

  const allChecked =
    filtered.length > 0 && filtered.every((d) => selected.has(d.id));
  const someChecked =
    filtered.some((d) => selected.has(d.id)) && !allChecked;

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
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
      `documents-${new Date().toISOString().split("T")[0]}.csv`,
      filtered.map((d) => ({
        file_name: d.file_name,
        type: d.type,
        vehicle_registration: d.vehicle_registration,
        expiry_date: d.expiry_date ?? "",
        // Défensif : le backend peut renvoyer des statuts absents du dictionnaire frontend
        ocr_status: OCR_STATUS[d.ocr_status]?.label ?? d.ocr_status,
        validity: DOCUMENT_VALIDITY[d.validity]?.label ?? d.validity,
        confidence: d.confidence ?? "",
        size: d.size,
        created_at: d.created_at?.split?.("T")?.[0] ?? "",
      })),
      [
        { key: "file_name", label: "Fichier" },
        { key: "type", label: "Type" },
        { key: "vehicle_registration", label: "Immatriculation" },
        { key: "expiry_date", label: "Échéance" },
        { key: "ocr_status", label: "OCR" },
        { key: "validity", label: "Validité" },
        { key: "confidence", label: "Confiance (%)" },
        { key: "size", label: "Taille (octets)" },
        { key: "created_at", label: "Uploadé le" },
      ]
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters + upload */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par fichier, type, immatriculation..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={ocrFilter} onValueChange={setOcrFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="OCR" />
            </SelectTrigger>
            <SelectContent>
              {OCR_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={validityFilter} onValueChange={setValidityFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Validité" />
            </SelectTrigger>
            <SelectContent>
              {VALIDITY_OPTIONS.map((o) => (
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
          <UploadDialog />
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selected.size}</span> document(s)
            sélectionné(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
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
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead className="hidden md:table-cell">Échéance</TableHead>
                <TableHead className="hidden md:table-cell">OCR</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Filter className="size-6 mx-auto mb-2 opacity-50" />
                    Aucun document ne correspond à vos critères.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow
                    key={d.id}
                    data-state={selected.has(d.id) ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => navigate(`/documents/${d.id}`)}
                  >
                    <TableCell
                      className="pl-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected.has(d.id)}
                        onCheckedChange={() => toggleOne(d.id)}
                        aria-label={`Sélectionner ${d.file_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{d.type}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {d.file_name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {d.vehicle_registration}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{formatDate(d.expiry_date)}</div>
                      {d.expiry_date && (
                        <div className="text-xs text-muted-foreground">
                          {formatRelative(d.expiry_date)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusBadge
                        label={OCR_STATUS[d.ocr_status]?.label ?? d.ocr_status ?? "—"}
                        color={OCR_STATUS[d.ocr_status]?.color ?? "gray"}
                        withDot
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={DOCUMENT_VALIDITY[d.validity]?.label ?? d.validity ?? "—"}
                        color={DOCUMENT_VALIDITY[d.validity]?.color ?? "gray"}
                        withDot
                      />
                    </TableCell>
                    <TableCell
                      className="text-right pr-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/documents/${d.id}`)}
                            >
                              <Eye className="size-4" />
                              <span className="sr-only">Voir</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Voir le détail</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {filtered.length} document(s) sur {allDocuments.length}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" />
            Précédent
          </Button>
          <Button variant="outline" size="sm" disabled>
            Suivant
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
