

import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { VehiclesTable } from "@/components/vehicles/vehicles-table";
import { apiGet } from "@/lib/api-client";

export default function VehiclesPage() {
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    void apiGet<{ total: number }>("/api/vehicles").then((data) =>
      setTotal(data.total)
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Véhicules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} véhicule(s) dans votre flotte.
          </p>
        </div>
        <Button asChild>
          <Link to="/vehicles/new">
            <Plus className="size-4" />
            Ajouter un véhicule
          </Link>
        </Button>
      </div>

      <VehiclesTable />
    </div>
  );
}
