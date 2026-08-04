

import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { appToast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [ssoLoading, setSsoLoading] = React.useState<"google" | "microsoft" | null>(null);
  const [email, setEmail] = React.useState("marie.dupont@transport-dupont.fr");
  const [password, setPassword] = React.useState("demo");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await login(email, password);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur FleetDocs.",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleSso(provider: "google" | "microsoft") {
    setSsoLoading(provider);
    try {
      await new Promise((r) => setTimeout(r, 800));
      // Mock SSO: log in with mock provider email
      const email = provider === "google"
        ? "marie.dupont@gmail.com"
        : "marie.dupont@outlook.com";
      await login(email, "sso-mock-token");
      appToast.success(
        `${provider === "google" ? "Google" : "Microsoft"} connecté`,
        { description: "Bienvenue sur FleetDocs." }
      );
      navigate("/dashboard");
    } finally {
      setSsoLoading(null);
    }
  }

  return (
    <AuthShell
      title="Connexion"
      description="Accédez à votre espace de gestion documentaire."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link
            to="/demo"
            className="font-medium text-primary hover:underline"
          >
            Demander une démo
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
            placeholder="vous@entreprise.fr"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" defaultChecked />
          <Label htmlFor="remember" className="text-sm text-muted-foreground">
            Se souvenir de moi (30 jours)
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Se connecter
        </Button>
      </form>

      {/* P2-11: SSO buttons */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou continuer avec</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={ssoLoading !== null}
            onClick={() => void handleSso("google")}
          >
            {ssoLoading === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={ssoLoading !== null}
            onClick={() => void handleSso("microsoft")}
          >
            {ssoLoading === "microsoft" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MicrosoftIcon />
            )}
            Microsoft
          </Button>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-center text-muted-foreground">
          🔑 Démo : utilisez n'importe quel email/mot de passe pour vous connecter.
        </p>
      </div>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
