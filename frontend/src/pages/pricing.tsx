import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Footer } from "@/components/marketing/sections";
import {
  PricingCards,
  ComparisonTable,
} from "@/components/pricing/pricing-cards";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Headphones, RefreshCw } from "lucide-react";

const guarantees = [
  {
    icon: RefreshCw,
    title: "Sans engagement",
    description: "Annulez à tout moment, prorata automatique.",
  },
  {
    icon: ShieldCheck,
    title: "Paiement sécurisé",
    description: "Stripe. CB, SEPA, virement. Factures PDF.",
  },
  {
    icon: Headphones,
    title: "Support inclus",
    description: "Réponse sous 48h (Starter) ou 4h (Pro).",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                Tarifs
              </p>
              <h1 className="mt-2 text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                Un prix juste pour chaque flotte
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Tarification au véhicule. Vous ne payez que pour ce que vous utilisez.
                20% de réduction en annuel.
              </p>
            </div>

            <div className="mt-12">
              <PricingCards showToggle billing="monthly" />
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {guarantees.map((g) => (
                <Card key={g.title} className="rounded-xl">
                  <CardContent className="pt-5 text-center">
                    <g.icon className="size-6 text-primary mx-auto" />
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      {g.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {g.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                Comparaison détaillée
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tout ce qui est inclus dans chaque offre.
              </p>
            </div>
            <div className="mt-10 rounded-xl border border-border bg-card p-4 sm:p-6">
              <ComparisonTable />
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Vous hésitez encore ?
            </h2>
            <p className="mt-3 text-primary-foreground/80">
              Essayez gratuitement avec 3 véhicules. Sans carte bancaire.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/login">Démarrer gratuitement</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/demo">Parler à un expert</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
