
import * as React from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatFileSize } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiUpload, apiGet, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import type { Vehicle, DocumentType } from "@/lib/types";

interface UploadDropzoneProps {
  vehicleId?: string;
  vehicleRegistration?: string;
  documentTypeId?: string;
  documentTypeName?: string;
  onUploaded?: () => void;
  onClose?: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  previewUrl?: string;
}

export function UploadDropzone({
  vehicleId: defaultVehicleId,
  vehicleRegistration,
  documentTypeId: defaultDocumentTypeId,
  documentTypeName,
  onUploaded,
  onClose,
}: UploadDropzoneProps) {
  const { toast } = useToast();
  const [files, setFiles] = React.useState<QueuedFile[]>([]);
  const [uploading, setUploading] = React.useState(false);

  // Step 2 form state (metadata form after file selection)
  const [showForm, setShowForm] = React.useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState(defaultVehicleId ?? "");
  const [selectedDocTypeId, setSelectedDocTypeId] = React.useState(defaultDocumentTypeId ?? "");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [issuedDate, setIssuedDate] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [docTypes, setDocTypes] = React.useState<DocumentType[]>([]);

  // Fetch vehicles and doc types for the form
  React.useEffect(() => {
    void Promise.all([
      apiGet<Vehicle[] | { items: Vehicle[] }>("/api/vehicles").then((d) => {
        const items = Array.isArray(d) ? d : d.items ?? [];
        setVehicles(items);
      }),
      apiGet<DocumentType[] | { items: DocumentType[] }>("/api/document-types").then((d) => {
        const items = Array.isArray(d) ? d : d.items ?? [];
        setDocTypes(items);
      }),
    ]).catch(() => {});
  }, []);

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        toast({
          title: "Fichier rejeté",
          description: `${rejectedFiles[0].file.name} — ${rejectedFiles[0].errors[0]?.message ?? "format non supporté"}`,
          variant: "destructive",
        });
      }
      const newFiles: QueuedFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: "queued" as const,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      setShowForm(true);
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    if (files.length <= 1) setShowForm(false);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!selectedVehicleId) {
      appToast.error("Véhicule obligatoire", { description: "Sélectionnez un véhicule." });
      return;
    }
    setUploading(true);

    let successCount = 0;
    let errorCount = 0;

    for (const uf of files) {
      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === uf.id ? { ...f, status: "uploading", progress: 10 } : f))
        );

        const formData = new FormData();
        formData.append("file", uf.file);
        formData.append("vehicle_id", selectedVehicleId);
        if (selectedDocTypeId) formData.append("document_type_id", selectedDocTypeId);
        if (expiryDate) formData.append("expiry_date", `${expiryDate}T00:00:00Z`);
        if (issuedDate) formData.append("issued_date", `${issuedDate}T00:00:00Z`);
        if (reference) formData.append("reference", reference);

        await apiUpload("/api/documents/upload", formData);

        // Animate progress
        for (let pct = 20; pct <= 100; pct += 20) {
          await new Promise((r) => setTimeout(r, 50));
          setFiles((prev) =>
            prev.map((f) => (f.id === uf.id ? { ...f, progress: pct } : f))
          );
        }

        setFiles((prev) =>
          prev.map((f) => (f.id === uf.id ? { ...f, status: "done", progress: 100 } : f))
        );
        successCount++;
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) => (f.id === uf.id ? { ...f, status: "error" } : f))
        );
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      appToast.success(`${successCount} document(s) ajouté(s)`, {
        description: "Vos documents sont maintenant disponibles dans la liste.",
      });
      onUploaded?.();
    }
    if (errorCount > 0) {
      appToast.error(`${errorCount} erreur(s) lors de l'upload`);
    }

    // Auto-close after successful upload
    if (errorCount === 0 && successCount > 0) {
      setTimeout(() => {
        onClose?.();
      }, 1500);
    }
  };

  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="space-y-4">
      {/* Step 1: Dropzone */}
      {!showForm || files.length === 0 ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? "Déposez les fichiers ici" : "Glissez-déposez vos fichiers ici"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ou parcourez vos fichiers — PDF, PNG, JPG · max 20 Mo
          </p>
        </div>
      ) : null}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              {files.length} fichier(s) sélectionné(s)
            </h4>
            {doneCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {doneCount} uploadé(s)
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card"
              >
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt={f.file.name} className="size-10 rounded object-cover" />
                ) : (
                  <div className="size-10 rounded bg-muted flex items-center justify-center">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(f.file.size)}
                    {f.status === "uploading" && ` · ${f.progress}%`}
                    {f.status === "done" && " · ✓ Uploadé"}
                    {f.status === "error" && " · ✗ Erreur"}
                  </p>
                  {f.status === "uploading" && (
                    <Progress value={f.progress} className="h-1 mt-1" />
                  )}
                </div>
                {f.status === "queued" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(f.id)}
                    className="size-8"
                  >
                    <X className="size-4" />
                  </Button>
                )}
                {f.status === "done" && (
                  <CheckCircle2 className="size-5 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Metadata form (shown after files are selected) */}
      {showForm && files.length > 0 && doneCount === 0 && (
        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Informations du document
            </h4>
            <p className="text-xs text-muted-foreground">
              Renseignez les informations ci-dessous pour chaque document.
            </p>
          </div>

          {/* Vehicle + Doc type */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Véhicule *</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={setSelectedVehicleId}
                disabled={Boolean(defaultVehicleId)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="font-mono">{v.registration}</span>
                      {" — "}
                      {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type de document</Label>
              <Select
                value={selectedDocTypeId}
                onValueChange={setSelectedDocTypeId}
                disabled={Boolean(defaultDocumentTypeId)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates + reference */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Date d'émission</Label>
              <Input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Date d'expiration</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Référence</Label>
              <Input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° doc..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Upload button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                files.forEach((f) => {
                  if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                });
                setFiles([]);
                setShowForm(false);
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedVehicleId}>
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" />
                  Uploader {files.length} fichier(s)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
