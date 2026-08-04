

import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, CheckCircle2, Bell, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-background to-background dark:from-blue-950/20" />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-900/30" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-sky-100/60 blur-3xl dark:bg-sky-900/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-5 gap-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
              Nouveau : OCR + IA pour la carte grise
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              La conformité documentaire de votre flotte,{" "}
              <span className="text-primary">sans effort.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              Uploadez vos cartes grises, assurances et contrôles techniques.
              Notre OCR + IA extrait les dates et vous alerte avant expiration.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/login">
                  Démarrer gratuitement
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link to="/#how">
                  <PlayCircle className="size-4" />
                  Voir une démo (2 min)
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-green-600" />
                3 véhicules gratuits
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-green-600" />
                Sans carte bancaire
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-green-600" />
                Hébergement EU
              </span>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative">
            <Card className="shadow-2xl shadow-blue-900/10 rounded-xl overflow-hidden border-border/80">
              <div className="bg-card px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-red-400" />
                  <div className="size-2.5 rounded-full bg-yellow-400" />
                  <div className="size-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  fleetdocs.app/dashboard
                </span>
              </div>
              <div className="p-5 space-y-4 bg-background">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="text-xs text-muted-foreground">Véhicules</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">24</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="text-xs text-muted-foreground">Conformité</p>
                    <p className="text-2xl font-semibold text-green-600 mt-1">87%</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-card">
                    <p className="text-xs text-muted-foreground">Alertes</p>
                    <p className="text-2xl font-semibold text-amber-600 mt-1">12</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">
                      Alertes récentes
                    </p>
                    <Bell className="size-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <AlertRow
                      icon={<AlertTriangle className="size-4 text-amber-500" />}
                      title="Assurance — EF-456-GH"
                      subtitle="Expire dans 30 jours"
                      tone="amber"
                    />
                    <AlertRow
                      icon={<AlertTriangle className="size-4 text-red-500" />}
                      title="Carte grise — IJ-789-KL"
                      subtitle="Expiré depuis 2 mois"
                      tone="red"
                    />
                    <AlertRow
                      icon={<FileText className="size-4 text-blue-500" />}
                      title="OCR en cours — licence.pdf"
                      subtitle="Traitement..."
                      tone="blue"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-foreground">
                      Répartition par statut
                    </p>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-green-500" style={{ width: "50%" }} />
                    <div className="bg-blue-500" style={{ width: "33%" }} />
                    <div className="bg-red-500" style={{ width: "9%" }} />
                    <div className="bg-yellow-500" style={{ width: "4%" }} />
                    <div className="bg-gray-400" style={{ width: "4%" }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-green-500" />Disponible 12</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-blue-500" />En service 8</span>
                    <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" />En panne 2</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertRow({
  icon,
  title,
  subtitle,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "amber" | "red" | "blue";
}) {
  const toneClasses = {
    amber: "border-l-amber-400",
    red: "border-l-red-400",
    blue: "border-l-blue-400",
  } as const;
  return (
    <div
      className={`flex items-start gap-3 rounded-md border border-l-4 border-border bg-background px-3 py-2 ${toneClasses[tone]}`}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  );
}
