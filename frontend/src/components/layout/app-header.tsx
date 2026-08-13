

import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Plus, Command as CmdIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommandPalette } from "@/components/layout/command-palette";

export function AppHeader() {
  const [alertCount, setAlertCount] = React.useState(0);
  React.useEffect(() => {
    const fetchCount = () => {
      apiGet<{ active: number }>("/api/alerts/summary")
        .then((d) => setAlertCount(d.active))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);
  const navigate = useNavigate();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const [searchValue, setSearchValue] = React.useState("");

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-3 border-b border-border bg-background/80 backdrop-blur-md px-3 sm:px-6">
      <SidebarTrigger className="-ml-1" />

      {/* Search - full width on mobile */}
      <form onSubmit={onSearchSubmit} className="flex-1 min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 pr-10 sm:pr-12 bg-muted/40 border-transparent focus-visible:bg-background text-sm"
          />
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Ouvrir le menu de commandes (Cmd+K)"
          >
            <CmdIcon className="size-3" />K
          </button>
        </div>
      </form>

      {/* Actions - compact on mobile */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCommandOpen(true)}
                className="hidden sm:inline-flex"
              >
                <CmdIcon className="size-4" />
                <span className="sr-only">Commandes</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Menu de commandes (⌘K)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/alerts" data-tour="alerts-bell">
                  <Bell className="size-4" />
                  <span className="sr-only">Alertes</span>
                  <Badge className="absolute -top-0.5 -right-0.5 size-4 min-w-4 rounded-full p-0 text-[9px] flex items-center justify-center">
                    12
                  </Badge>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{alertCount} alertes actives</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button asChild size="sm" className="hidden sm:inline-flex" data-tour="upload-button">
          <Link to="/documents">
            <Plus className="size-4" />
            <span className="hidden md:inline">Uploader</span>
          </Link>
        </Button>

        {/* Mobile FAB for upload */}
        <Button asChild size="icon" className="sm:hidden" data-tour="upload-button">
          <Link to="/documents">
            <Plus className="size-4" />
            <span className="sr-only">Uploader</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
