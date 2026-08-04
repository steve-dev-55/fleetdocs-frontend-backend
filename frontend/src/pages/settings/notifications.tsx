

import * as React from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { NotificationsPanel } from "@/components/settings/notifications-panel";

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez comment et quand être alerté.
        </p>
      </div>
      <SettingsTabs />
      <NotificationsPanel />
    </div>
  );
}
