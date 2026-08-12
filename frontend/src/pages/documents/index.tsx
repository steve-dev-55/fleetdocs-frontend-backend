

import * as React from "react";
import { DocumentsTable } from "@/components/documents/documents-table";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez tous les documents de votre flotte. Saisie manuelle, alertes et exports.
        </p>
      </div>
      <DocumentsTable />
    </div>
  );
}
