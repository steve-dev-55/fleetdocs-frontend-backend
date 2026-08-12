

import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  OCR_STATUS,
  DOCUMENT_VALIDITY,
  type ColorKey,
} from "@/lib/status-config";
import { apiGet, apiDelete, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
} from "@/lib/utils";
import { CommentsSection } from "@/components/documents/comments-section";
import { ShareLinksSection } from "@/components/documents/share-links-section";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Truck,
  Calendar,
  User,
  Hash,
  Sparkles,
  Clock,
  Share2,
  Archive,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FleetDocument, Vehicle } from "@/lib/types";

// Backend returns different field names than the frontend expects.
// We normalize the response here.
interface BackendDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type?: string;
  version: number;
  ocr_status: string;
  ocr_confidence?: number;
  ocr_data?: Record<string, unknown>;
  validity_status: string;
  expiry_date?: string;
  issued_date?: string;
  reference?: string;
  document_type_id?: string;
  document_type?: { name: string; code: string } | null;
  vehicle_id: string;
  uploaded_by_id?: string;
  uploaded_by_name?: string;
  created_at: string;
}

function normalizeDoc(d: BackendDocument): FleetDocument {
  return {
    id: d.id,
    file_name: d.file_name,
    file_url: d.file_url,
    type: d.document_type?.name ?? "—",
    type_id: d.document_type_id ?? "",
    vehicle_id: d.vehicle_id,
    vehicle_registration: "",
    expiry_date: d.expiry_date,
    issued_date: d.issued_date,
    ocr_status: d.ocr_status as FleetDocument["ocr_status"],
    validity: d.validity_status as FleetDocument["validity"],
    size: d.file_size,
    mime_type: d.mime_type ?? "application/octet-stream",
    confidence: d.ocr_confidence,
    version: d.version,
    created_by: d.uploaded_by_name ?? "—",
    created_at: d.created_at,
    reference: d.reference,
  };
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const docId = params.id ?? "";
  const [doc, setDoc] = React.useState<(FleetDocument & { file_url?: string }) | null>(null);
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);

  React.useEffect(() => {
    if (!docId) return;
    void apiGet<BackendDocument>(`/api/documents/${docId}`)
      .then((d) => {
        const normalized = normalizeDoc(d);
        // Fetch vehicle registration
        if (normalized.vehicle_id) {
          void apiGet<Vehicle>(`/api/vehicles/${normalized.vehicle_id}`).then((v) => {
            setVehicle(v);
            setDoc({ ...normalized, vehicle_registration: v.registration });
          });
        } else {
          setDoc(normalized);
        }
      })
      .catch(() => {});
  }, [docId]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await apiDelete(`/api/documents/${docId}`);
      appToast.success("Document archivé");
      window.location.href = "/documents";
    } catch (err) {
      appToast.error("Erreur lors de l'archivage", {
        description: getErrorMessage(err),
      });
    } finally {
      setArchiving(false);
    }
  };

  if (!doc) {
    return (
      <div className="text-center py-12 text-muted-foreground">Chargement...</div>
    );
  }

  const meta = [
    { icon: Truck, label: "Véhicule", value: doc.vehicle_registration || vehicle?.registration || "—", mono: true },
    { icon: FileText, label: "Type", value: doc.type || "—" },
    { icon: Calendar, label: "Date d'émission", value: formatDate(doc.issued_date) },
    { icon: Calendar, label: "Date d'expiration", value: formatDate(doc.expiry_date) },
    { icon: Hash, label: "Référence", value: doc.reference || "—", mono: true },
    { icon: User, label: "Uploadé par", value: doc.created_by || "—" },
    { icon: Clock, label: "Uploadé le", value: formatDateTime(doc.created_at) },
    { icon: Hash, label: "Taille", value: formatFileSize(doc.size) },
  ];

  const ocrStatusInfo = OCR_STATUS[doc.ocr_status] ?? {
    label: "OCR inconnu",
    color: "gray" as ColorKey,
  };
  const validityInfo = DOCUMENT_VALIDITY[doc.validity] ?? {
    label: "Validité inconnue",
    color: "gray" as ColorKey,
  };

  const ocrEvents = [
    { at: doc.created_at, label: "Document uploadé", icon: Upload },
    {
      at: doc.created_at,
      label: `OCR démarré — type détecté : ${doc.type}`,
      icon: Sparkles,
    },
    {
      at: doc.created_at,
      label: `OCR terminé — confiance ${doc.confidence ?? "—"}%`,
      icon: Sparkles,
    },
    {
      at: doc.created_at,
      label: `Statut : ${ocrStatusInfo.label}`,
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/documents">
            <ArrowLeft className="size-4" />
            Documents
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight break-all">
                {doc.file_name}
              </h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <StatusBadge
                  label={ocrStatusInfo.label}
                  color={ocrStatusInfo.color}
                  withDot
                />
                <StatusBadge
                  label={validityInfo.label}
                  color={validityInfo.color}
                  withDot
                />
                <Badge variant="outline">v{doc.version}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              Partager
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              Prévisualiser
            </Button>
            <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
              <Button>
                <Download className="size-4" />
                Télécharger
              </Button>
            </a>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              <Archive className="size-4" />
              {archiving ? "Archivage..." : "Archiver"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: file card + preview */}
        <Card className="rounded-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Fichier</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border bg-muted/40 hover:bg-muted/60 transition-colors flex flex-col items-center justify-center gap-3"
            >
              <FileText className="size-12 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">PDF</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(doc.size)}
              </p>
              <p className="text-xs text-primary mt-1">Cliquez pour prévisualiser</p>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="size-4" />
                Prévisualiser
              </Button>
              <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="size-4" />
                  Télécharger
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Middle: metadata */}
        <Card className="rounded-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Métadonnées</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {meta.map((m) => (
                <div
                  key={m.label}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <dt className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <m.icon className="size-4" />
                    {m.label}
                  </dt>
                  <dd
                    className={`font-medium text-foreground text-right ${
                      m.mono ? "font-mono text-xs" : ""
                    }`}
                  >
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>

            {vehicle && (
              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  to={`/vehicles/${vehicle.id}`}
                  className="flex items-center gap-3 rounded-md hover:bg-muted/40 p-2 -mx-2 transition-colors"
                >
                  <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Truck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Véhicule lié</p>
                    <p className="text-sm font-mono font-medium text-foreground">
                      {vehicle.registration}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: OCR + history */}
        <Card className="rounded-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">OCR & Historique</CardTitle>
          </CardHeader>
          <CardContent>
            {doc.confidence !== undefined && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Score de confiance OCR
                  </span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {doc.confidence}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-blue-200 dark:bg-blue-900 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${doc.confidence}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {ocrEvents.map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                      <ev.icon className="size-3.5" />
                    </div>
                    {i < ocrEvents.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>
                  <div className="pt-1 pb-3">
                    <p className="text-sm text-foreground">{ev.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(ev.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P2-9: Share links section */}
      <ShareLinksSection documentId={doc.id} />

      {/* P2-8: Comments section */}
      <CommentsSection documentId={doc.id} />

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="break-all">{doc.file_name}</DialogTitle>
            <DialogDescription>
              Aperçu du document · {formatFileSize(doc.size)} ·{" "}
              {doc.type}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border border-border bg-muted/40">
            {doc.mime_type?.startsWith("image/") ? (
              <img
                src={doc.file_url}
                alt={doc.file_name}
                className="w-full h-[60vh] object-contain bg-white"
              />
            ) : (
              <iframe
                src={doc.file_url}
                title={doc.file_name}
                className="w-full h-[60vh] bg-white"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Download className="size-4" />
                Télécharger
              </Button>
            </a>
            <Button onClick={() => setPreviewOpen(false)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* P2-9: Share dialog (alternative quick access) */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5" />
              Partager ce document
            </DialogTitle>
            <DialogDescription>
              Gérez les liens de partage signés pour ce document.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            <ShareLinksSection documentId={doc.id} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Local icon
function Upload({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
