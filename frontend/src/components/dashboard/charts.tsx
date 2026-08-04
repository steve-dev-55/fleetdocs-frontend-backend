

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VEHICLE_STATUS, COLOR_CLASSES } from "@/lib/status-config";
import type { VehicleStatus } from "@/lib/types";

interface StatusDonutChartProps {
  data: { status: VehicleStatus; count: number }[];
}

const STATUS_COLOR_HEX: Record<VehicleStatus, string> = {
  active: "#16a34a",
  maintenance: "#d97706",
  available: "#16a34a",
  in_service: "#2563eb",
  broken_down: "#dc2626",
  in_garage: "#d97706",
  immobilized: "#6b7280",
  out_of_service: "#374151",
};

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartData = data.map((d) => ({
    name: VEHICLE_STATUS[d.status].label,
    value: d.count,
    color: STATUS_COLOR_HEX[d.status],
    key: d.status,
  }));

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Répartition par statut</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative h-[200px] w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name: string, item) => {
                    const pct = total ? ((value / total) * 100).toFixed(1) : "0";
                    const label =
                      (item?.payload as { name?: string })?.name ?? "";
                    return [`${value} véhicule(s) — ${pct}%`, label];
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">
                {total}
              </span>
              <span className="text-xs text-muted-foreground">véhicules</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-1 gap-2 w-full">
            {chartData.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-foreground truncate">{d.name}</span>
                </div>
                <span className="font-semibold text-foreground tabular-nums">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComplianceBarChartProps {
  data: { type: string; rate: number }[];
}

export function ComplianceBarChart({ data }: ComplianceBarChartProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conformité par type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((d) => {
            const color =
              d.rate >= 90
                ? "bg-green-500"
                : d.rate >= 75
                ? "bg-blue-500"
                : d.rate >= 60
                ? "bg-amber-500"
                : "bg-red-500";
            return (
              <div key={d.type}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-foreground">{d.type}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {d.rate}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${d.rate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
