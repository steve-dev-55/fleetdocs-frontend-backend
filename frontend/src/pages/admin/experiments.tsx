

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiGet } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { Loader2, FlaskConical, TrendingUp, Users } from "lucide-react";

interface AbExperiment {
  name: string;
  description: string;
  variants: {
    A: { count: number; conversions: number };
    B: { count: number; conversions: number };
  };
}

function conversionRate(variant: { count: number; conversions: number }): number {
  if (variant.count === 0) return 0;
  return Math.round((variant.conversions / variant.count) * 1000) / 10;
}

export default function ExperimentsPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = React.useState<AbExperiment[]>([]);

  React.useEffect(() => {
    if (isLoading) return;
    if (user?.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    void apiGet<{ experiments: AbExperiment[] }>("/api/ab-test").then((data) =>
      setExperiments(data.experiments)
    );
  }, [user, isLoading, navigate]);

  if (isLoading || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <FlaskConical className="size-6" />
          Expériences A/B
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez les variantes et taux de conversion de vos expériences.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {experiments.map((exp) => {
          const aRate = conversionRate(exp.variants.A);
          const bRate = conversionRate(exp.variants.B);
          const winner = aRate > bRate ? "A" : bRate > aRate ? "B" : null;
          const totalUsers = exp.variants.A.count + exp.variants.B.count;
          return (
            <Card key={exp.name} className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">{exp.name}</CardTitle>
                <CardDescription>{exp.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {totalUsers} utilisateurs assignés
                </div>
                <div className="space-y-3">
                  {(["A", "B"] as const).map((v) => {
                    const data = exp.variants[v];
                    const rate = conversionRate(data);
                    const widthPct =
                      totalUsers > 0 ? (data.count / totalUsers) * 100 : 0;
                    return (
                      <div key={v} className="space-y-1">
                        <div className="flex items-baseline justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={v === winner ? "default" : "outline"}
                              className={
                                v === winner
                                  ? "bg-green-600 text-white"
                                  : ""
                              }
                            >
                              Variante {v}
                            </Badge>
                            {v === winner && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <TrendingUp className="size-3" />
                                Gagnant
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-foreground">
                            {rate}%
                          </span>
                        </div>
                        <Progress value={widthPct} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {data.count} users · {data.conversions} conversions
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-xl border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center shrink-0">
              <FlaskConical className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Infrastructure A/B testing
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Les variantes sont déterministes par utilisateur (persistées en localStorage) avec une répartition 50/50.
                Les événements de conversion sont tracés via <code className="text-xs px-1 rounded bg-muted">POST /api/analytics/track</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
