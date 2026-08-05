

import * as React from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  FileText,
  Bell,
  Download,
  Settings,
  Search,
  Plus,
  UserPlus,
  ChevronRight,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Keyboard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/status-config";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { initials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  shortcut?: string;
  adminOnly?: boolean;
  dataTour?: string;
}

const mainNav: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, shortcut: "g d" },
  { label: "Véhicules", href: "/vehicles", icon: Truck, shortcut: "g v", dataTour: "sidebar-vehicles" },
  { label: "Documents", href: "/documents", icon: FileText, shortcut: "g D" },
  { label: "Alertes", href: "/alerts", icon: Bell, badge: 12, shortcut: "g a" },
  { label: "Exports", href: "/exports", icon: Download, shortcut: "g e" },
  { label: "Recherche", href: "/search", icon: Search },
];

const adminNav: NavItem[] = [
  { label: "Journal d'audit", href: "/admin/audit-logs", icon: ShieldCheck, adminOnly: true },
  { label: "Expériences A/B", href: "/admin/experiments", icon: LayoutDashboard, adminOnly: true },
  { label: "Types de véhicules", href: "/admin/vehicle-types", icon: Truck, adminOnly: true },
  { label: "Types de documents", href: "/admin/document-types", icon: FileText, adminOnly: true },
];

const settingsNav: NavItem[] = [
  { label: "Paramètres", href: "/settings", icon: Settings, shortcut: "g s" },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, company, logout } = useAuth();
  const { state, setOpen } = useSidebar();
  const isAdmin = user?.role === "admin";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                    F
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">FleetDocs</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {company?.name ?? "Transport Dupont SAS"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setOpen(state === "collapsed")}
                      className="size-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
                      aria-label={state === "collapsed" ? "Étendre" : "Réduire"}
                    >
                      {state === "collapsed" ? (
                        <PanelLeftOpen className="size-4" />
                      ) : (
                        <PanelLeftClose className="size-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {state === "collapsed" ? "Étendre la barre" : "Réduire la barre"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNav.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Compte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Nouveau véhicule">
              <Link to="/vehicles/new">
                <Plus className="size-4" />
                <span>Nouveau véhicule</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem data-tour="user-menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-md">
                    <AvatarFallback
                      className="rounded-md text-white"
                      style={{
                        backgroundColor: user?.avatar_color ?? "#2563EB",
                      }}
                    >
                      {initials(user?.first_name, user?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user ? `${user.first_name} ${user.last_name}` : "Utilisateur"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user ? ROLE_LABELS[user.role] : "—"}
                    </span>
                  </div>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings/account">
                    <UserPlus className="size-4" />
                    Mon compte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="size-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/audit-logs">
                    <ShieldCheck className="size-4" />
                    Journal d'audit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">Thème</span>
                  <ThemeToggle />
                </div>
                <DropdownMenuItem
                  onClick={() => {
                    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
                  }}
                >
                  <Keyboard className="size-4" />
                  Raccourcis clavier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/40"
                >
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string | null;
}) {
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname?.startsWith(item.href));
  const tooltipText = item.shortcut
    ? `${item.label} · ${item.shortcut}`
    : item.label;
  return (
    <SidebarMenuItem data-tour={item.dataTour}>
      <SidebarMenuButton asChild isActive={active} tooltip={tooltipText}>
        <Link to={item.href}>
          <item.icon className="size-4" />
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <Badge
              variant="secondary"
              className="ml-auto bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300"
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
