

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Save, Upload } from "lucide-react";

export function CompanyForm() {
  const { company, updateCompany } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(company?.name ?? "");
  const [siret, setSiret] = React.useState(company?.siret ?? "");
  const [vat, setVat] = React.useState(company?.vat_number ?? "");
  const [address, setAddress] = React.useState(company?.address ?? "");
  const [postalCode, setPostalCode] = React.useState(company?.postal_code ?? "");
  const [city, setCity] = React.useState(company?.city ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      updateCompany({
        name,
        siret,
        vat_number: vat,
        address,
        postal_code: postalCode,
        city,
      });
      toast({
        title: "Entreprise mise à jour",
        description: "Les informations ont été enregistrées.",
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
            <div className="size-16 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {(company?.name ?? "F")[0]}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm">
                <Upload className="size-4" />
                Téléverser un logo
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, SVG · 512×512 max · 1 Mo max
              </p>
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
