

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiPut, getErrorMessage } from "@/lib/api-client";
import { Loader2, Save, Upload, X } from "lucide-react";

export function CompanyForm() {
  const { company, updateCompany } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [logoLoading, setLogoLoading] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(company?.logo_url ?? null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState(company?.name ?? "");
  const [siret, setSiret] = React.useState(company?.siret ?? "");
  const [vat, setVat] = React.useState(company?.vat_number ?? "");
  const [address, setAddress] = React.useState(company?.address ?? "");
  const [postalCode, setPostalCode] = React.useState(company?.postal_code ?? "");
  const [city, setCity] = React.useState(company?.city ?? "");

  function handleLogoClick() {
    fileInputRef.current?.click();
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/png", "image/svg+xml", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez choisir une image PNG, SVG, JPEG ou WEBP.",
        variant: "destructive",
      });
      return;
    }

    // Validate size (max 1 Mo)
    if (file.size > 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le logo ne doit pas dépasser 1 Mo.",
        variant: "destructive",
      });
      return;
    }

    // Create local preview
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setLogoFile(file);
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await apiPut<{
        id: string;
        name: string;
        siret?: string;
        address?: string;
        phone?: string;
        city?: string;
        country?: string;
      }>("/api/settings/company", {
        name,
        siret,
        address,
        city,
      });
      updateCompany(updated);
      toast({
        title: "Entreprise mise à jour",
        description: "Les informations ont été enregistrées.",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom de l'entreprise *</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="123 456 789 01234"
              />
            </div>
            <div>
              <Label htmlFor="vat">N° TVA intracom.</Label>
              <Input
                id="vat"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="FR12345678901"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Adresse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Rue</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="postal">Code postal</Label>
              <Input
                id="postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo de l'entreprise" className="size-full object-cover" />
              ) : (
                (company?.name ?? "F")[0]
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLogoClick}
                  disabled={logoLoading}
                >
                  {logoLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {logoPreview ? "Changer le logo" : "Téléverser un logo"}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="size-4" />
                    Retirer
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, SVG · 512×512 max · 1 Mo max
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}
