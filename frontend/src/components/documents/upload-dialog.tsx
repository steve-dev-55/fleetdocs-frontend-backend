

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { apiGet } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import type { Vehicle, DocumentType } from "@/lib/types";

interface UploadDialogProps {
  trigger?: React.ReactNode;
  defaultVehicleId?: string;
  defaultDocumentTypeId?: string;
}

export function UploadDialog({
  trigger,
  defaultVehicleId,
  defaultDocumentTypeId,
}: UploadDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [vehicleId, setVehicleId] = React.useState(defaultVehicleId ?? "");
  const [documentTypeId, setDocumentTypeId] = React.useState(
    defaultDocumentTypeId ?? ""
  );
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [documentTypes, setDocumentTypes] = React.useState<DocumentType[]>([]);

  React.useEffect(() => {
    if (open) {
      setVehicleId(defaultVehicleId ?? "");
      setDocumentTypeId(defaultDocumentTypeId ?? "");
      // Fetch vehicles and document types in parallel
      void Promise.all([
        apiGet<{ items: Vehicle[] } | Vehicle[]>("/api/vehicles").then((d) => {
          const items = Array.isArray(d) ? d : d.items ?? [];
          setVehicles(items);
        }),
        apiGet<{ items: DocumentType[] } | DocumentType[]>("/api/document-types").then((d) => {
          const items = Array.isArray(d) ? d : d.items ?? [];
          setDocumentTypes(items);
        }),
      ]).catch(() => {
        // ignore — empty selects will be shown
      });
    }
  }, [open, defaultVehicleId, defaultDocumentTypeId]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const docType = documentTypes.find((d) => d.id === documentTypeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Upload className="size-4" />
            Uploader
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Uploader des documents</DialogTitle>
          <DialogDescription>
            Glissez-déposez vos fichiers. L&apos;OCR extrait automatiquement les dates clés.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="upload-vehicle">Véhicule</Label>
            <Select
              value={vehicleId}
              onValueChange={setVehicleId}
              disabled={Boolean(defaultVehicleId)}
            >
              <SelectTrigger id="upload-vehicle" className="mt-1.5 w-full">
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
            <Label htmlFor="upload-doctype">Type de document</Label>
            <Select
              value={documentTypeId}
              onValueChange={setDocumentTypeId}
              disabled={Boolean(defaultDocumentTypeId)}
            >
              <SelectTrigger id="upload-doctype" className="mt-1.5 w-full">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-2">
          <UploadDropzone
            vehicleId={vehicleId}
            vehicleRegistration={vehicle?.registration}
            documentTypeId={documentTypeId}
            documentTypeName={docType?.name}
            onClose={() => {
              setOpen(false);
              toast({
                title: "Documents ajoutés",
                description:
                  "Vos documents sont en cours de traitement OCR.",
              });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
