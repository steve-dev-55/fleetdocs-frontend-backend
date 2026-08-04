

import * as React from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2,
  User,
  Shield,
  CreditCard,
  Bell,
} from "lucide-react";

const tabs = [
  { label: "Entreprise", href: "/settings", icon: Building2, exact: true },
  { label: "Mon compte", href: "/settings/account", icon: User },
  { label: "Sécurité", href: "/settings/security", icon: Shield },
  { label: "Facturation", href: "/settings/billing", icon: CreditCard },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
];

export function SettingsTabs() {
  const { pathname } = useLocation();

  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
