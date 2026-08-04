

import * as React from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { BillingPanel } from "@/components/settings/billing-panel";

export default function BillingSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Facturation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre abonnement, votre moyen de paiement et vos factures.
        </p>
      </div>
      <SettingsTabs />
      <BillingPanel />
    </div>
  );
}
