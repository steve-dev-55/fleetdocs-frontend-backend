// FleetDocs — SWR data-fetching helpers (Vite edition)
// Uses the apiGet/apiPost helpers from api-client.ts (which inject the JWT
// from localStorage and prefix requests with VITE_API_URL).

import useSWR, { type SWRConfiguration, type Key } from "swr";
import { apiGet } from "./api-client";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function useApi<T = unknown>(
  path: Key,
  options?: SWRConfiguration<T>
) {
  return useSWR<T>(
    path,
    (url: string) => apiGet<T>(url),
    options
  );
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
