

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Copy } from "lucide-react";
import { appToast } from "@/lib/toast";

export function VehicleQrDialog({
  open,
  onOpenChange,
  registration,
  url,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registration: string;
  url: string;
}) {
  const qrRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${registration}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    appToast.success("QR Code téléchargé");
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      appToast.success("Lien copié dans le presse-papier");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code — Véhicule {registration}</DialogTitle>
          <DialogDescription>
            Scannez ce QR code pour accéder directement à la fiche véhicule.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4 printable-qr">
          <div ref={qrRef} className="p-4 rounded-lg border border-border bg-white">
            <QRCodeCanvas
              value={url}
              size={220}
              level="M"
              includeMargin={false}
              fgColor="#111827"
              bgColor="#ffffff"
            />
          </div>
          <div className="text-center">
            <p className="font-mono font-semibold text-foreground">
              {registration}
            </p>
            <p className="text-xs text-muted-foreground mt-1 break-all px-4">
              {url}
            </p>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="size-4" />
            Copier le lien
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="size-4" />
            PNG
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="size-4" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
