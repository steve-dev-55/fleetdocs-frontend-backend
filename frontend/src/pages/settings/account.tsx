

import * as React from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { AccountForm } from "@/components/settings/account-form";

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Mon compte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modifiez votre profil et votre mot de passe.
        </p>
      </div>
      <SettingsTabs />
      <AccountForm />
    </div>
  );
}
