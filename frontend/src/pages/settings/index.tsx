

import * as React from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { CompanyForm } from "@/components/settings/company-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre entreprise, votre compte, la sécurité, la facturation et les notifications.
        </p>
      </div>
      <SettingsTabs />
      <CompanyForm />
    </div>
  );
}
