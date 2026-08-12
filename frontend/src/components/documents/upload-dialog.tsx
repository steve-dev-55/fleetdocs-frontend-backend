
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
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { Upload } from "lucide-react";

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
  const [open, setOpen] = React.useState(false);

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
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Sélectionnez un fichier puis renseignez ses informations (type, dates, référence).
          </DialogDescription>
        </DialogHeader>

        <UploadDropzone
          vehicleId={defaultVehicleId}
          documentTypeId={defaultDocumentTypeId}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
