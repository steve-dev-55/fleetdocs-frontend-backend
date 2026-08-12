import * as React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatFCFA } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  /** Monthly price in FCFA. null = "sur devis". */
  priceMonthly: number | null;
  /** Yearly price in FCFA (per month, paid annually — 20% off). */
  priceYearly: number | null;
  maxVehicles: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
}

// FleetDocs pricing (FCFA) — Starter 19 000 / Pro 32 000 / Enterprise sur devis.
// Yearly = monthly × 12 × 0.8 (20% off, equivalent monthly price paid annually).
export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19000,
    priceYearly: 18240,
    maxVehicles: "Jusqu'à 50 véhicules",
    description: "Pour les petites flottes qui démarrent.",
    features: [
      "Documents illimités",
      "Alertes J-90/60/30/15/7",
      "3 utilisateurs inclus",
      "Export CSV / Excel",
      "Support email (48h)",
    ],
    cta: "Commencer",
    ctaHref: "/login",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 32000,
    priceYearly: 30720,
    maxVehicles: "Jusqu'à 200 véhicules",
    description: "Pour les flottes en croissance.",
    features: [
      "Tout Starter, plus :",
      "10 utilisateurs inclus",
      "Rôles & permissions avancés",
      "Audit trail complet",
      "Webhooks & API",
      "Support prioritaire (4h)",
      "Types de documents personnalisés",
    ],
    cta: "Demander une démo",
    ctaHref: "/demo",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    priceYearly: null,
    maxVehicles: "Véhicules illimités",
    description: "Pour les grandes flottes et groupes.",
    features: [
      "Tout Pro, plus :",
      "Utilisateurs illimités",
      "SSO / SAML",
      "Hébergement dédié",
      "SLA 99.9% avec garanties",
      "CSM dédié",
      "Onboarding personnalisé",
    ],
    cta: "Demander une démo",
    ctaHref: "/demo",
  },
];

export function PricingCards({
  billing = "monthly",
  showToggle = true,
}: {
  billing?: "monthly" | "yearly";
  showToggle?: boolean;
}) {
  const [period, setPeriod] = React.useState<"monthly" | "yearly">(billing);

  return (
    <div>
      {showToggle && (
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                period === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                period === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annuel
              <span className="ml-1.5 text-xs">(-20%)</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {plans.map((plan) => {
          const price =
            period === "monthly" ? plan.priceMonthly : plan.priceYearly;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl transition-all",
                plan.highlight
                  ? "border-primary border-2 shadow-lg shadow-primary/10 md:-translate-y-2"
                  : "border-border shadow-sm hover:shadow-md"
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">
                  Plus populaire
                </Badge>
              )}
              <CardHeader className="pb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
                <div className="mt-4">
                  {plan.id === "enterprise" || price === null ? (
                    <p className="text-3xl font-bold text-foreground">
                      Sur devis
                    </p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {formatFCFA(price)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / mois / véhicule
                      </span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.maxVehicles}
                    {period === "yearly" &&
                      plan.id !== "enterprise" &&
                      plan.priceMonthly !== null && (
                        <span className="ml-1 text-green-600 font-medium">
                          (économisez 20%)
                        </span>
                      )}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((f, i) => {
                    const isHeader = f.endsWith(":");
                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          isHeader
                            ? "font-semibold text-foreground mt-2"
                            : "text-muted-foreground"
                        )}
                      >
                        {!isHeader && (
                          <Check className="size-4 text-green-600 mt-0.5 shrink-0" />
                        )}
                        <span>{f}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  asChild
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link to={plan.ctaHref}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const comparisonFeatures = [
  { name: "Véhicules", starter: "50", pro: "200", enterprise: "Illimité" },
  { name: "Utilisateurs", starter: "3", pro: "10", enterprise: "Illimité" },
  { name: "Documents illimités", starter: true, pro: true, enterprise: true },
  { name: "Alertes email", starter: true, pro: true, enterprise: true },
  { name: "Export CSV/Excel", starter: true, pro: true, enterprise: true },
  { name: "Audit trail", starter: false, pro: true, enterprise: true },
  { name: "API & webhooks", starter: false, pro: true, enterprise: true },
  { name: "SSO / SAML", starter: false, pro: false, enterprise: true },
  { name: "Hébergement dédié", starter: false, pro: false, enterprise: true },
  {
    name: "Support",
    starter: "Email 48h",
    pro: "Prioritaire 4h",
    enterprise: "Dédié 1h",
  },
];

export function ComparisonTable() {
  return (
    <div className="mt-16 overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
              Fonctionnalité
            </th>
            <th className="text-center py-3 px-4 font-semibold text-foreground">
              Starter
            </th>
            <th className="text-center py-3 px-4 font-semibold text-foreground">
              Pro
            </th>
            <th className="text-center py-3 px-4 font-semibold text-foreground">
              Enterprise
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisonFeatures.map((f, i) => (
            <tr
              key={i}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="py-3 px-4 text-foreground">{f.name}</td>
              {[f.starter, f.pro, f.enterprise].map((v, j) => (
                <td key={j} className="py-3 px-4 text-center">
                  {typeof v === "boolean" ? (
                    v ? (
                      <Check className="size-4 text-green-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )
                  ) : (
                    <span className="text-foreground">{v}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
