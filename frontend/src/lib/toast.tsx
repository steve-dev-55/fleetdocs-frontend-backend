

// FleetDocs — Toast helpers (P3-5, P3-6, P3-7)
// Wraps sonner with variant borders + undo button + countdown bar.

import { toast as sonnerToast } from "sonner";
import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Undo2 } from "lucide-react";

type Variant = "success" | "warning" | "error" | "info";

const variantConfig: Record<
  Variant,
  { className: string; icon: React.ElementType; iconColor: string }
> = {
  success: {
    className: "toast-success",
    icon: CheckCircle2,
    iconColor: "text-green-600",
  },
  warning: {
    className: "toast-warning",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  error: {
    className: "toast-error",
    icon: XCircle,
    iconColor: "text-red-600",
  },
  info: {
    className: "toast-info",
    icon: Info,
    iconColor: "text-blue-600",
  },
};

interface ToastOptions {
  description?: string;
  duration?: number;
}

function renderToast(
  variant: Variant,
  message: string,
  options?: ToastOptions
) {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;
  return sonnerToast(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    className: cfg.className,
    icon: <Icon className={`size-4 ${cfg.iconColor}`} />,
  });
}

export const appToast = {
  success: (message: string, options?: ToastOptions) =>
    renderToast("success", message, options),
  warning: (message: string, options?: ToastOptions) =>
    renderToast("warning", message, options),
  error: (message: string, options?: ToastOptions) =>
    renderToast("error", message, options),
  info: (message: string, options?: ToastOptions) =>
    renderToast("info", message, options),

  // P3-5: Toast with undo button (5s window)
  withUndo: (
    message: string,
    onUndo: () => void | Promise<void>,
    options?: { description?: string }
  ) => {
    return sonnerToast(message, {
      description: options?.description,
      duration: 5000,
      className: "toast-warning",
      icon: <Undo2 className="size-4 text-amber-600" />,
      action: {
        label: "Annuler",
        onClick: () => {
          void onUndo();
          sonnerToast.success("Action annulée");
        },
      },
    });
  },
};

// Convenience: use sonner's toast directly if needed
export { sonnerToast as toast };
