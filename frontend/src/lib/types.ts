// FleetDocs — Types partagés (frontend-only demo)

export type UserRole = "admin" | "manager" | "operator" | "viewer";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
  last_login?: string;
}

export interface Company {
  id: string;
  name: string;
  siret: string;
  vat_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  plan: "starter" | "pro" | "enterprise";
  max_vehicles: number;
  current_vehicles: number;
  logo_url?: string;
  created_at: string;
}

export type VehicleStatus =
  | "available"
  | "in_service"
  | "broken_down"
  | "in_garage"
  | "immobilized"
  | "out_of_service";

export type ComplianceLevel = "green" | "orange" | "red";

export interface Vehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
  type: string;
  ptac_kg: number;
  year: number;
  vin: string;
  status: VehicleStatus;
  mileage_km?: number;
  fuel_type?: string;
  color?: string;
  site?: string;
  driver?: string;
  compliance: ComplianceLevel;
  compliance_detail?: {
    valid: number;
    expiring: number;
    expired: number;
    total: number;
  };
  created_at: string;
  updated_at?: string;
}

export type OcrStatus =
  | "pending_ocr"
  | "ocr_done"
  | "validated"
  | "rejected"
  | "manual";

export type DocumentValidity = "valid" | "expiring_30" | "expiring_60" | "expired" | "no_expiry";

export interface FleetDocument {
  id: string;
  file_name: string;
  type: string;
  type_id: string;
  vehicle_id: string;
  vehicle_registration: string;
  expiry_date?: string;
  issued_date?: string;
  ocr_status: OcrStatus;
  validity: DocumentValidity;
  size: number;
  mime_type: string;
  confidence?: number;
  version: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
  reference?: string;
}

export type AlertType =
  | "expiring_90"
  | "expiring_60"
  | "expiring_30"
  | "expiring_15"
  | "expiring_7"
  | "expired"
  | "vehicle_broken"
  | "vehicle_immobilized"
  | "ocr_failed"
  | "document_missing";

export type AlertCategory = "document" | "vehicle" | "system";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  severity: "info" | "warning" | "critical";
  vehicle_id?: string;
  vehicle_registration?: string;
  document_id?: string;
  document_type?: string;
  triggered_at: string;
  due_date?: string;
  status: AlertStatus;
  message: string;
}

export interface DocumentType {
  id: string;
  name: string;
  code: string;
  category: "vehicle" | "driver" | "company";
  alert_days: number[];
  is_required: boolean;
  has_expiry: boolean;
  description?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  plan: string;
  url?: string;
}

export interface DashboardData {
  total_vehicles: number;
  compliance_rate: number;
  active_alerts: number;
  pending_ocr: number;
  documents_count: number;
  status_distribution: { status: VehicleStatus; count: number }[];
  compliance_by_type: { type: string; rate: number }[];
  alerts_trend: { month: string; count: number }[];
  uploads_trend: { month: string; count: number }[];
}
