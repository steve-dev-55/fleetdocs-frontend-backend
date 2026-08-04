

import * as React from "react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

export default function DemoPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: "Demande envoyée",
      description: "Nous vous recontactons sous 24h ouvrées.",
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">
              Démo
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Voyons comment FleetDocs peut aider votre flotte
            </h1>
            <p className="mt-4 text-muted-foreground">
              Réservez une démo de 30 minutes. Nous analysons vos besoins et configurons votre espace.
            </p>
          </div>

          <div className="mt-12 grid lg:grid-cols-5 gap-8">
            <Card className="lg:col-span-3 rounded-xl">
              <CardContent className="pt-6">
                {submitted ? (
                  <div className="py-12 text-center">
                    <div className="size-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="size-7 text-green-600" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-foreground">
                      Merci ! Votre demande est enregistrée.
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Un expert FleetDocs vous contacte sous 24h ouvrées pour planifier la démo.
                    </p>
                    <Button
                      className="mt-6"
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                    >
                      Envoyer une autre demande
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">Prénom *</Label>
                        <Input
                          id="first_name"
                          name="first_name"
                          required
                          placeholder="Marie"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Nom *</Label>
                        <Input
                          id="last_name"
                          name="last_name"
                          required
                          placeholder="Dupont"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email professionnel *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="marie@transport-dupont.fr"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Entreprise *</Label>
                      <Input
                        id="company"
                        name="company"
                        required
                        placeholder="Transport Dupont SAS"
                        className="mt-1.5"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fleet_size">Taille de flotte</Label>
                        <Select name="fleet_size" defaultValue="10-50">
                          <SelectTrigger className="mt-1.5 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-9">1 à 9 véhicules</SelectItem>
                            <SelectItem value="10-50">10 à 50 véhicules</SelectItem>
                            <SelectItem value="51-200">51 à 200 véhicules</SelectItem>
                            <SelectItem value="200+">Plus de 200 véhicules</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          placeholder="+33 6 12 34 56 78"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="message">Votre besoin (optionnel)</Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={3}
                        placeholder="Décrivez vos défis actuels de gestion documentaire..."
                        className="mt-1.5"
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full">
                      Demander ma démo
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      En soumettant ce formulaire, vous acceptez d'être recontacté par FleetDocs.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-xl bg-muted/40 border-dashed">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground">Ce que vous obtenez</h3>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary">✓</span>
                      Démo personnalisée de 30 min
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">✓</span>
                      Analyse de votre conformité actuelle
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">✓</span>
                      Configuration de votre espace de test
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">✓</span>
                      Devis adapté à votre flotte
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">✓</span>
                      Sans engagement
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground">Préférez le téléphone ?</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Notre équipe est disponible du lundi au vendredi, 9h-18h.
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    +33 1 23 45 67 89
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
