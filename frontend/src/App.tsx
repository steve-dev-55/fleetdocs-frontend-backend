import * as React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/app-layout";

import LandingPage from "@/pages/landing";
import PricingPage from "@/pages/pricing";
import DemoPage from "@/pages/demo";
import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import AcceptInvitationPage from "@/pages/auth/accept-invitation";
import DashboardPage from "@/pages/dashboard";
import VehiclesPage from "@/pages/vehicles";
import NewVehiclePage from "@/pages/vehicles/new";
import VehicleDetailPage from "@/pages/vehicles/detail";
import EditVehiclePage from "@/pages/vehicles/edit";
import DocumentsPage from "@/pages/documents";
import DocumentDetailPage from "@/pages/documents/detail";
import AlertsPage from "@/pages/alerts";
import ExportsPage from "@/pages/exports";
import SearchPage from "@/pages/search";
import SettingsPage from "@/pages/settings";
import AccountSettingsPage from "@/pages/settings/account";
import SecuritySettingsPage from "@/pages/settings/security";
import BillingSettingsPage from "@/pages/settings/billing";
import NotificationsSettingsPage from "@/pages/settings/notifications";
import AuditLogsPage from "@/pages/admin/audit-logs";
import ExperimentsPage from "@/pages/admin/experiments";
import NotFound from "@/pages/not-found";
import GlobalError from "@/pages/error";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <GlobalError
          error={
            this.state.error ?? new Error("Unknown error")
          }
          reset={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/demo" element={<DemoPage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/accept-invitation"
              element={<AcceptInvitationPage />}
            />

            {/* App (with sidebar + header) */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/vehicles/new" element={<NewVehiclePage />} />
              <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
              <Route
                path="/vehicles/:id/edit"
                element={<EditVehiclePage />}
              />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/exports" element={<ExportsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/settings/account"
                element={<AccountSettingsPage />}
              />
              <Route
                path="/settings/security"
                element={<SecuritySettingsPage />}
              />
              <Route
                path="/settings/billing"
                element={<BillingSettingsPage />}
              />
              <Route
                path="/settings/notifications"
                element={<NotificationsSettingsPage />}
              />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route
                path="/admin/experiments"
                element={<ExperimentsPage />}
              />
            </Route>

            {/* Fallback */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </ErrorBoundary>

        <Toaster />
        <Sonner
          position="bottom-right"
          richColors={false}
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group border border-border bg-popover text-popover-foreground",
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
