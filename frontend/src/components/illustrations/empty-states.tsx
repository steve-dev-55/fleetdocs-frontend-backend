

// FleetDocs — Custom SVG illustrations for empty states (P3-1)
// Inline SVGs, no external deps. Each illustration is a React component.

import * as React from "react";
import { cn } from "@/lib/utils";

interface IllustrationProps {
  className?: string;
}

export function EmptyVehiclesIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full max-w-[200px] mx-auto", className)}
      aria-hidden="true"
    >
      {/* Ground shadow */}
      <ellipse cx="100" cy="120" rx="70" ry="6" fill="#E5E7EB" />
      {/* Truck body */}
      <rect x="35" y="60" width="100" height="40" rx="6" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      {/* Cab */}
      <path d="M135 70 L170 70 L170 100 L135 100 Z" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2" />
      {/* Window */}
      <rect x="142" y="76" width="22" height="14" rx="2" fill="#2563EB" opacity="0.3" />
      {/* Wheels */}
      <circle cx="60" cy="105" r="10" fill="#1F2937" />
      <circle cx="60" cy="105" r="4" fill="#9CA3AF" />
      <circle cx="140" cy="105" r="10" fill="#1F2937" />
      <circle cx="140" cy="105" r="4" fill="#9CA3AF" />
      {/* Door line */}
      <line x1="85" y1="65" x2="85" y2="95" stroke="#2563EB" strokeWidth="1.5" opacity="0.5" />
      {/* "No vehicles" subtle icon */}
      <circle cx="100" cy="40" r="14" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
      <path d="M100 32 V42 M100 46 V48" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyDocumentsIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full max-w-[200px] mx-auto", className)}
      aria-hidden="true"
    >
      {/* Stack of documents */}
      <rect x="60" y="35" width="80" height="100" rx="4" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5" transform="rotate(-6 100 85)" />
      <rect x="58" y="38" width="80" height="100" rx="4" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5" transform="rotate(-3 100 88)" />
      <rect x="55" y="40" width="80" height="100" rx="4" fill="#FFFFFF" stroke="#6B7280" strokeWidth="2" />
      {/* Lines on top document */}
      <line x1="65" y1="60" x2="125" y2="60" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="65" y1="72" x2="115" y2="72" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="65" y1="84" x2="120" y2="84" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="65" y1="96" x2="100" y2="96" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Folded corner */}
      <path d="M125 40 L135 50 L125 50 Z" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1.5" />
      {/* Plus icon */}
      <circle cx="55" cy="35" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <path d="M55 28 V42 M48 35 H62" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyAlertsIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full max-w-[200px] mx-auto", className)}
      aria-hidden="true"
    >
      {/* Bell */}
      <path
        d="M100 30 C 70 30, 55 50, 55 80 V100 L 45 115 H 155 L 145 100 V80 C 145 50, 130 30, 100 30 Z"
        fill="#DBEAFE"
        stroke="#2563EB"
        strokeWidth="2"
      />
      {/* Bell clapper */}
      <circle cx="100" cy="120" r="6" fill="#2563EB" />
      {/* Checkmark overlay */}
      <circle cx="140" cy="40" r="18" fill="#DCFCE7" stroke="#16A34A" strokeWidth="2" />
      <path d="M132 40 L138 46 L148 34" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyUsersIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full max-w-[200px] mx-auto", className)}
      aria-hidden="true"
    >
      {/* Three people silhouettes */}
      <circle cx="65" cy="55" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <path d="M40 110 C 40 88, 55 80, 65 80 C 75 80, 90 88, 90 110 V115 H 40 Z" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <circle cx="100" cy="45" r="16" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2" />
      <path d="M70 115 C 70 88, 88 78, 100 78 C 112 78, 130 88, 130 115 V120 H 70 Z" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2" />
      <circle cx="135" cy="55" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <path d="M110 110 C 110 88, 125 80, 135 80 C 145 80, 160 88, 160 110 V115 H 110 Z" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" />
      <circle cx="155" cy="35" r="12" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
      <path d="M155 28 V42 M148 35 H162" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full max-w-[200px] mx-auto", className)}
      aria-hidden="true"
    >
      <circle cx="85" cy="65" r="32" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="2" />
      <line x1="108" y1="88" x2="135" y2="115" stroke="#9CA3AF" strokeWidth="4" strokeLinecap="round" />
      <text x="85" y="76" textAnchor="middle" fontSize="32" fontWeight="700" fill="#6B7280">?</text>
    </svg>
  );
}
