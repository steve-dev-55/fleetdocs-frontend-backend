import * as React from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, setToken } from "./api-client";
import type { User, Company, UserRole } from "./types";

interface AuthContextValue {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  updateCompany: (patch: Partial<Company>) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

interface MeResponse {
  user?: User;
  company?: Company;
  token?: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<User | null>(null);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiGet<MeResponse>("/api/auth/me");
      setUser(data.user ?? null);
      setCompany(data.company ?? null);
    } catch {
      setUser(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const data = await apiPost<MeResponse>("/api/auth/login", {
        email,
        password,
      });
      if (data.token) setToken(data.token);
      setUser(data.user ?? null);
      setCompany(data.company ?? null);
    },
    []
  );

  const logout = React.useCallback(async () => {
    try {
      await apiPost("/api/auth/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setCompany(null);
    navigate("/login");
  }, [navigate]);

  const updateUser = React.useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updateCompany = React.useCallback((patch: Partial<Company>) => {
    setCompany((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      company,
      isLoading,
      login,
      logout,
      refresh,
      updateUser,
      updateCompany,
    }),
    [
      user,
      company,
      isLoading,
      login,
      logout,
      refresh,
      updateUser,
      updateCompany,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Permission helper — operator can access dashboard
export function can(
  role: UserRole | undefined,
  action:
    | "vehicles.read"
    | "vehicles.write"
    | "documents.read"
    | "documents.write"
    | "settings.read"
    | "settings.write"
    | "users.manage"
): boolean {
  if (!role) return false;
  const matrix: Record<UserRole, string[]> = {
    admin: [
      "vehicles.read",
      "vehicles.write",
      "documents.read",
      "documents.write",
      "settings.read",
      "settings.write",
      "users.manage",
    ],
    manager: [
      "vehicles.read",
      "vehicles.write",
      "documents.read",
      "documents.write",
      "settings.read",
    ],
    operator: ["documents.read", "documents.write", "vehicles.read"],
    viewer: ["vehicles.read", "documents.read", "settings.read"],
  };
  return matrix[role]?.includes(action) ?? false;
}
