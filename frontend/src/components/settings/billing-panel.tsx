

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
const mockInvoices = [
  { id: "in_001", number: "FLEET-2026-001", date: "2026-07-01", amount: 768000, status: "paid" as const, plan: "Pro" },
  { id: "in_002", number: "FLEET-2026-002", date: "2026-06-01", amount: 768000, status: "paid" as const, plan: "Pro" },
  { id: "in_003", number: "FLEET-2026-003", date: "2026-05-01", amount: 768000, status: "paid" as const, plan: "Pro" },
];
import { PLAN_LABELS } from "@/lib/status-config";
import { formatFCFA, formatDate, downloadMockPdf } from "@/lib/utils";
import { CreditCard, Download, ArrowUpRight, Check } from "lucide-react";

interface PlanOption {
  id: "starter" | "pro" | "enterprise";
  name: string;
  price: number;
  max: number;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    price: 19000,
    max: 50,
  },
  {
    id: "pro",
    name: "Pro",
    price: 32000,
    max: 200,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 0,
    max: -1,
  },
];

export function BillingPanel() {
  const { company } = useAuth();
  const { toast } = useToast();
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<string>("pro");

  const usagePercent = company
    ? Math.round((company.current_vehicles / company.max_vehicles) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Plan actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {PLAN_LABELS[company?.plan ?? "pro"]}
                </h3>
                <Badge>{company?.plan === "pro" ? "Actuel" : ""}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {company?.plan === "starter" && "19 000 FCFA / mois / véhicule · max 50 véhicules"}
                {company?.plan === "pro" && "32 000 FCFA / mois / véhicule · max 200 véhicules"}
                {company?.plan === "enterprise" && "Tarif sur devis · illimité"}
              </p>
            </div>
            <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ArrowUpRight className="size-4" />
                  Changer de plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Changer de plan</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un nouveau plan. La facturation sera proratisée.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  {PLAN_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
                        selectedPlan === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.price === 0
                            ? "Sur devis"
                            : `${formatFCFA(p.price)}/mois/véh · max ${
                                p.max === -1 ? "illimité" : p.max
                              }`}
                        </p>
                      </div>
                      {selectedPlan === p.id && (
                        <Check className="size-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUpgradeOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => {
                      setUpgradeOpen(false);
                      toast({
                        title: "Plan mis à jour",
                        description: `Vous êtes maintenant sur le plan ${
                          PLAN_OPTIONS.find((p) => p.id === selectedPlan)?.name
                        }.`,
                      });
                    }}
                  >
                    Confirmer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilisation</span>
              <span className="font-medium text-foreground">
                {company?.current_vehicles} / {company?.max_vehicles} véhicules
              </span>
            </div>
            <Progress value={usagePercent} className="mt-2 h-2" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {usagePercent}% de votre quota utilisé
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Moyen de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-foreground text-background flex items-center justify-center font-bold text-xs">
                CB
              </div>
              <div>
                <p className="text-sm font-medium text-foreground font-mono">
                  •••• •••• •••• 4242
                </p>
                <p className="text-xs text-muted-foreground">
                  Visa · expire 09/27
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <CreditCard className="size-4" />
              Modifier
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            🔒 Paiements traités par Stripe. Aucune donnée bancaire stockée sur nos serveurs.
          </p>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin -mx-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">N° facture</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Plan</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-6 font-mono text-sm">
                      {inv.number}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {inv.plan}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatFCFA(inv.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          inv.status === "paid"
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
                            : ""
                        }
                      >
                        {inv.status === "paid" ? "Payée" : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          downloadMockPdf(`${inv.number}.pdf`)
                        }
                        aria-label="Télécharger la facture"
                      >
                        <Download className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
