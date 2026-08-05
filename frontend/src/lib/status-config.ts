// FleetDocs — Configuration des statuts (labels FR + couleurs)
// P0-6: Traduire TOUS les codes statut en labels français

import type {
  VehicleStatus,
  OcrStatus,
  AlertType,
  DocumentValidity,
  ComplianceLevel,
} from "./types";

type ColorKey =
  | "green"
  | "blue"
  | "red"
  | "yellow"
  | "gray"
  | "dark-gray"
  | "amber"
  | "purple"
  | "sky"
  | "orange";

export type { ColorKey };

export const VEHICLE_STATUS: Record<
  VehicleStatus,
  { label: string; color: ColorKey; description: string }
> = {
  active: { label: "Actif", color: "green", description: "Véhicule opérationnel" },
  maintenance: { label: "En maintenance", color: "yellow", description: "Véhicule en maintenance" },
  available: {
    label: "Disponible",
    color: "green",
    description: "Véhicule disponible et opérationnel",
  },
  in_service: {
    label: "En service",
    color: "blue",
    description: "Véhicule actuellement en mission",
  },
  broken_down: {
    label: "En panne",
    color: "red",
    description: "Véhicule en panne technique",
  },
  in_garage: {
    label: "Au garage",
    color: "yellow",
    description: "Véhicule en réparation chez le garagiste",
  },
  immobilized: {
    label: "Immobilisé",
    color: "gray",
    description: "Véhicule immobilisé administrativement",
  },
  out_of_service: {
    label: "Hors service",
    color: "dark-gray",
    description: "Véhicule retiré du parc",
  },
  sold: {
    label: "Vendu",
    color: "gray",
    description: "Véhicule vendu",
  },
  archived: {
    label: "Archivé",
    color: "dark-gray",
    description: "Véhicule archivé (suppression logique)",
  },
};

export const ALERT_TYPES: Record<AlertType, string> = {
  document_expiring: "Document expirant",
  document_expired: "Document expiré",
  ocr_failed: "Échec OCR",
  compliance_issue: "Problème de conformité",
  expiring_90: "Expire dans 90 jours",
  expiring_60: "Expire dans 60 jours",
  expiring_30: "Expire dans 30 jours",
  expiring_15: "Expire dans 15 jours",
  expiring_7: "Expire dans 7 jours",
  expired: "Expiré",
  vehicle_broken: "Véhicule en panne",
  vehicle_immobilized: "Véhicule immobilisé",
  document_missing: "Document manquant",
};

export const ALERT_SEVERITY: Record<
  AlertType,
  { severity: "info" | "warning" | "critical"; color: ColorKey }
> = {
  document_expiring: { severity: "warning", color: "amber" },
  document_expired: { severity: "critical", color: "red" },
  ocr_failed: { severity: "warning", color: "orange" },
  compliance_issue: { severity: "warning", color: "orange" },
  expiring_90: { severity: "info", color: "blue" },
  expiring_60: { severity: "info", color: "blue" },
  expiring_30: { severity: "warning", color: "amber" },
  expiring_15: { severity: "warning", color: "orange" },
  expiring_7: { severity: "critical", color: "red" },
  expired: { severity: "critical", color: "red" },
  vehicle_broken: { severity: "critical", color: "red" },
  vehicle_immobilized: { severity: "warning", color: "orange" },
  document_missing: { severity: "warning", color: "amber" },
};

export const OCR_STATUS: Record<
  OcrStatus,
  { label: string; color: ColorKey }
> = {
  pending_ocr: { label: "OCR en cours", color: "amber" },
  processing: { label: "Traitement en cours", color: "amber" },
  completed: { label: "OCR terminé", color: "blue" },
  ocr_done: { label: "OCR terminé", color: "blue" },
  validated: { label: "Validé", color: "green" },
  rejected: { label: "Rejeté", color: "red" },
  manual: { label: "Saisie manuelle", color: "purple" },
  failed: { label: "Échec OCR", color: "red" },
};

export const DOCUMENT_VALIDITY: Record<
  DocumentValidity,
  { label: string; color: ColorKey }
> = {
  valid: { label: "Valide", color: "green" },
  expiring_30: { label: "Expire < 30 jours", color: "amber" },
  expiring_60: { label: "Expire < 60 jours", color: "blue" },
  expiring_soon: { label: "Expire bientôt", color: "amber" },
  expired: { label: "Expiré", color: "red" },
  no_expiry: { label: "Sans échéance", color: "gray" },
  unknown: { label: "Inconnue", color: "gray" },
};

export const COMPLIANCE_LEVEL: Record<
  ComplianceLevel,
  { label: string; color: ColorKey; description: string }
> = {
  green: {
    label: "Conforme",
    color: "green",
    description: "Tous les documents sont à jour",
  },
  orange: {
    label: "À surveiller",
    color: "orange",
    description: "Au moins un document expire bientôt (< 30 jours)",
  },
  red: {
    label: "Non conforme",
    color: "red",
    description: "Au moins un document est expiré",
  },
};

// Mapping couleur -> classes Tailwind (pour badges/dots)
export const COLOR_CLASSES: Record<
  ColorKey,
  { bg: string; text: string; border: string; dot: string; bgSoft: string }
> = {
  green: {
    bg: "bg-green-600",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-900",
    dot: "bg-green-500",
    bgSoft: "bg-green-50 dark:bg-green-950/40",
  },
  blue: {
    bg: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900",
    dot: "bg-blue-500",
    bgSoft: "bg-blue-50 dark:bg-blue-950/40",
  },
  red: {
    bg: "bg-red-600",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-900",
    dot: "bg-red-500",
    bgSoft: "bg-red-50 dark:bg-red-950/40",
  },
  yellow: {
    bg: "bg-yellow-500",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-900",
    dot: "bg-yellow-500",
    bgSoft: "bg-yellow-50 dark:bg-yellow-950/40",
  },
  gray: {
    bg: "bg-gray-500",
    text: "text-gray-700 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-500",
    bgSoft: "bg-gray-100 dark:bg-gray-800/40",
  },
  "dark-gray": {
    bg: "bg-gray-700",
    text: "text-gray-800 dark:text-gray-300",
    border: "border-gray-300 dark:border-gray-600",
    dot: "bg-gray-700",
    bgSoft: "bg-gray-200 dark:bg-gray-800/60",
  },
  amber: {
    bg: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900",
    dot: "bg-amber-500",
    bgSoft: "bg-amber-50 dark:bg-amber-950/40",
  },
  purple: {
    bg: "bg-purple-600",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-900",
    dot: "bg-purple-500",
    bgSoft: "bg-purple-50 dark:bg-purple-950/40",
  },
  sky: {
    bg: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-900",
    dot: "bg-sky-500",
    bgSoft: "bg-sky-50 dark:bg-sky-950/40",
  },
  orange: {
    bg: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-900",
    dot: "bg-orange-500",
    bgSoft: "bg-orange-50 dark:bg-orange-950/40",
  },
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  operator: "Opérateur",
  viewer: "Lecteur",
  fleet_manager: "Gestionnaire de flotte",
  super_admin: "Super Administrateur",
};

export const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};
