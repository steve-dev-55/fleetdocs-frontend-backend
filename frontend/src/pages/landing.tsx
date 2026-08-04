import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Hero } from "@/components/marketing/hero";
import {
  ValueProps,
  HowItWorks,
  Faq,
  CtaFinal,
  Footer,
  LogosStrip,
} from "@/components/marketing/sections";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <LogosStrip />
        <ValueProps />
        <HowItWorks />

        {/* Pricing teaser */}
        <section className="py-20 sm:py-28 bg-muted/40" id="pricing">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                Tarifs
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Simple, transparent, au véhicule
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Pas de frais cachés. Annulez à tout moment. 3 véhicules gratuits pour tester.
              </p>
            </div>
            <div className="mt-12">
              <PricingCards showToggle={false} billing="monthly" />
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="ghost">
                <Link to="/pricing">
                  Voir tous les tarifs et la comparaison
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
}
