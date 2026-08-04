

import * as React from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { SecurityPanel } from "@/components/settings/security-panel";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Sécurité
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activez la 2FA et gérez vos sessions actives.
        </p>
      </div>
      <SettingsTabs />
      <SecurityPanel />
    </div>
  );
}
