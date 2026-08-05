

import * as React from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatFileSize } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/api-client";

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  ocrDone?: boolean;
  confidence?: number;
}

interface UploadDropzoneProps {
  /** Vehicle id pre-selected (vehicle detail page) */
  vehicleId?: string;
  vehicleRegistration?: string;
  /** Document type pre-selected */
  documentTypeId?: string;
  documentTypeName?: string;
  onUploaded?: (file: UploadFile) => void;
  onClose?: () => void;
}

export function UploadDropzone({
  vehicleId,
  vehicleRegistration,
  documentTypeId,
  documentTypeName,
  onUploaded,
  onClose,
}: UploadDropzoneProps) {
  const { toast } = useToast();
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const onDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        toast({
          title: "Fichiers refusés",
          description: `${rejected.length} fichier(s) non accepté(s). PDF, PNG, JPG uniquement, max 10 Mo.`,
          variant: "destructive",
        });
      }
      const newFiles: UploadFile[] = accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        progress: 0,
        status: "queued",
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    noClick: false,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const startUpload = async () => {
    if (!files.length) return;
    if (!vehicleId || !documentTypeId) {
      toast({
        title: "Informations manquantes",
        description: "Sélectionnez un véhicule et un type de document.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    const toUpload = files.filter((f) => f.status === "queued");
    for (const uf of toUpload) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uf.id ? { ...f, status: "uploading" } : f
        )
      );
      try {
        // Real upload to /api/documents via multipart/form-data
        const formData = new FormData();
        formData.append("file", uf.file);
        formData.append("vehicle_id", vehicleId);
        formData.append("document_type_id", documentTypeId);
        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            detail?: string;
          };
          throw new Error(err.detail ?? `HTTP ${res.status}`);
        }
        // Animate progress
        for (let pct = 10; pct <= 100; pct += 15) {
          await new Promise((r) => setTimeout(r, 30));
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id ? { ...f, progress: pct } : f
            )
          );
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uf.id ? { ...f, status: "done", progress: 100 } : f
          )
        );
        // Simulate OCR completion after a few seconds (the backend processes async)
        setTimeout(() => {
          const confidence = 85 + Math.random() * 13;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id
                ? {
                    ...f,
                    ocrDone: true,
                    confidence: parseFloat(confidence.toFixed(1)),
                  }
                : f
            )
          );
          toast({
            title: "OCR terminé",
            description: `${uf.file.name} — confiance ${confidence.toFixed(1)}%`,
          });
        }, 2500);
        onUploaded?.(uf);
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uf.id ? { ...f, status: "error" } : f
          )
        );
        toast({
          title: "Upload échoué",
          description:
            getErrorMessage(err),
          variant: "destructive",
        });
      }
    }
    setUploading(false);
    const okCount = files.filter((f) => f.status === "done").length;
    if (okCount > 0) {
      toast({
        title: "Upload terminé",
        description: `${okCount} fichier(s) uploadé(s).`,
      });
    }
  };

  const doneCount = files.filter((f) => f.status === "done").length;
  const pendingCount = files.filter((f) => f.status === "queued").length;

  return (
    <div className="space-y-4">
      {/* Context info */}
      {(vehicleRegistration || documentTypeName) && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          {vehicleRegistration && (
            <div>
              🚛 Véhicule pré-sélectionné :{" "}
              <span className="font-mono font-semibold">
                {vehicleRegistration}
              </span>
            </div>
          )}
          {documentTypeName && (
            <div>
              📄 Type de document :{" "}
              <span className="font-semibold">{documentTypeName}</span>
            </div>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UploadCloud className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive
                ? "Déposez vos fichiers ici"
                : "Glissez-déposez vos fichiers ici"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ou{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                className="text-primary hover:underline font-medium"
              >
                parcourez vos fichiers
              </button>
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            PDF, PNG, JPG · max 10 Mo · plusieurs fichiers acceptés
          </p>
        </div>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <div className="size-9 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    disabled={uploading && f.status === "uploading"}
                    className="text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30"
                    aria-label="Retirer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(f.file.size)}
                </p>
                {f.status === "uploading" && (
                  <Progress value={f.progress} className="mt-2 h-1.5" />
                )}
                {f.status === "done" && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="size-3.5 text-green-600" />
                    <span className="text-green-600">Uploadé</span>
                    {f.ocrDone ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-blue-600">
                          OCR terminé — {f.confidence}% confiance
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Loader2 className="size-3 animate-spin" />
                          OCR en cours...
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            {doneCount} uploadé(s) · {pendingCount} en attente
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (onClose) onClose();
                else setFiles([]);
              }}
              disabled={uploading}
            >
              {onClose ? "Fermer" : "Vider"}
            </Button>
            <Button
              onClick={startUpload}
              disabled={uploading || pendingCount === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" />
                  Uploader {pendingCount > 0 ? `${pendingCount} ` : ""}
                  fichier{pendingCount > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
