

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Truck, Loader2 } from "lucide-react";
import { apiUpload, apiGet, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";

interface VehiclePhotoProps {
  vehicleId: string;
  registration: string;
}

export function VehiclePhoto({ vehicleId, registration }: VehiclePhotoProps) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<{ photo_url: string | null }>(
        `/api/vehicles/${vehicleId}/photo`
      );
      setPhotoUrl(data.photo_url);
    } catch {
      // ignore
    }
  }, [vehicleId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiUpload<{ photo_url: string }>(
        `/api/vehicles/${vehicleId}/photo`,
        fd
      );
      setPhotoUrl(data.photo_url);
      appToast.success("Photo mise à jour");
    } catch (err) {
      appToast.error("Upload échoué", {
        description: getErrorMessage(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative size-32 rounded-xl border-2 border-dashed border-border bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-center overflow-hidden group"
        aria-label={photoUrl ? "Changer la photo" : "Ajouter une photo"}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Photo véhicule ${registration}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Truck className="size-8" />
            )}
            <span className="text-xs">Ajouter une photo</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Camera className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {photoUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="size-3.5" />
          Changer
        </Button>
      )}
    </div>
  );
}
