// FleetDocs — Utilities (CSV export, date formatting, file size, FCFA, etc.)

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateLong(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = d.getTime() - now;
  const absDays = Math.round(Math.abs(diff) / (1000 * 60 * 60 * 24));
  if (absDays === 0) return "Aujourd'hui";
  if (absDays === 1) return diff > 0 ? "Demain" : "Hier";
  if (diff > 0) return `Dans ${absDays} jours`;
  return `Il y a ${absDays} jours`;
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

/**
 * Format an amount as West African CFA francs (XOF).
 * Example: formatFCFA(19000) → "19 000 FCFA"
 */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Backward-compat alias (some imported components still call formatEuro).
export const formatEuro = formatFCFA;

// CSV export from array of objects — P1-14
export function exportToCsv(
  filename: string,
  rows: Record<string, string | number | null | undefined>[],
  headers?: { key: string; label: string }[]
): void {
  if (!rows.length) return;
  const cols =
    headers?.map((h) => h.key) ?? Object.keys(rows[0]);
  const headerRow =
    headers?.map((h) => `"${h.label}"`).join(",") ??
    cols.map((c) => `"${c}"`).join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const v = r[c];
          if (v === null || v === undefined) return '""';
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(",")
    )
    .join("\n");
  const csv = "\uFEFF" + headerRow + "\n" + body; // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Mock PDF download — P0-12
export function downloadMockPdf(filename: string, content?: string): void {
  const body =
    content ??
    `%PDF-1.4\n% FleetDocs — Document mock\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 4\n0000000000 65535 f \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF`;
  const blob = new Blob([body], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Debounce — P0-7
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export function initials(first?: string, last?: string): string {
  const f = first?.[0]?.toUpperCase() ?? "";
  const l = last?.[0]?.toUpperCase() ?? "";
  return (f + l) || "U";
}

/**
 * Normalise une réponse document du backend vers le type frontend FleetDocument.
 */
export function normalizeDocument(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    validity: raw.validity ?? raw.validity_status,
    size: raw.size ?? raw.file_size,
    confidence: raw.confidence ?? raw.ocr_confidence,
    type: raw.type ?? raw.type_name,
    type_id: raw.type_id ?? raw.document_type_id,
    created_by: raw.created_by ?? raw.uploaded_by_name ?? raw.uploaded_by_id ?? "",
    mime_type: raw.mime_type ?? "",
    ocr_status: raw.ocr_status ?? "manual",
    created_at: raw.created_at ?? raw.uploaded_at ?? new Date().toISOString(),
  };
}

/** Applique normalizeDocument sur une liste (ou { items: [...] }). */
export function normalizeDocuments(data: unknown): Record<string, unknown>[] {
  const list: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown })?.items)
    ? (data as { items: unknown[] }).items
    : Array.isArray((data as { documents?: unknown })?.documents)
    ? (data as { documents: unknown[] }).documents
    : [];
  return list.map((d) => normalizeDocument(d as Record<string, unknown>));
}
