import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/components/layout/command-palette";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsHelpDialog } from "@/components/layout/shortcuts-help-dialog";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";

function CommandKListener() {
  const { setOpen } = useCommandPalette();
  const [helpOpen, setHelpOpen] = React.useState(false);
  useKeyboardShortcuts(() => setHelpOpen(true));

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setOpen]);

  return <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, user, navigate]);
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function AppLayout() {
  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background relative">
            {/* Grid pattern overlay for depth */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0" 
                 style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
            <AuthGate>
              <PageTransition>
                <Outlet />
              </PageTransition>
            </AuthGate>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CommandKListener />
      <OnboardingTour />
    </CommandPaletteProvider>
  );
}
