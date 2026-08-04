

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordStrength,
} from "@/components/auth/password-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
const mockInvitation = {
  invitedByEmail: "jean.dupont@transport-dupont.fr",
  email: "marie.dupont@transport-dupont.fr",
  companyName: "Transport Dupont SAS",
  company_name: "Transport Dupont SAS",
  invited_by: "Jean Dupont",
  role: "manager" as const,
  expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
};
import { ROLE_LABELS } from "@/lib/status-config";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AcceptInvitationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [strength, setStrength] = React.useState(0);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }
    if (strength < 2) {
      toast({
        title: "Mot de passe trop faible",
        description: "Choisissez un mot de passe plus solide.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      await login(mockInvitation.email, password);
      toast({
        title: "Compte créé",
        description: `Bienvenue chez ${mockInvitation.company_name} !`,
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — invitation context */}
      <aside className="hidden lg:flex flex-col justify-between w-1/2 bg-primary text-primary-foreground p-10">
        <div>
          <div className="inline-flex items-center gap-2">
            <div className="size-9 rounded-md bg-primary-foreground text-primary flex items-center justify-center font-bold">
              F
            </div>
            <span className="text-lg font-semibold">FleetDocs</span>
          </div>
        </div>
        <div>
          <div className="size-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center mb-6">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Vous avez été invité par {mockInvitation.invited_by} à rejoindre{" "}
            <span className="underline decoration-primary-foreground/40 decoration-4 underline-offset-4">
              {mockInvitation.company_name}
            </span>
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-lg">
            Créez votre compte pour accéder à l'espace de gestion documentaire
            de la flotte.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-sm">
            <span className="size-1.5 rounded-full bg-primary-foreground" />
            Rôle :{" "}
            <span className="font-semibold">
              {ROLE_LABELS[mockInvitation.role]}
            </span>
          </div>
        </div>
        <div className="text-sm text-primary-foreground/60">
          Lien d'invitation valable jusqu'au{" "}
          {new Date(mockInvitation.expires_at).toLocaleDateString("fr-FR")}
        </div>
      </aside>

      {/* Right panel — form */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Créer votre compte
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mockInvitation.email}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  required
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5"
                  placeholder="Marie"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5"
                  placeholder="Dupont"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={mockInvitation.email}
                disabled
                className="mt-1.5 bg-muted/50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Email défini par l'administrateur.
              </p>
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onStrengthChange={setStrength}
                placeholder="••••••••"
                className="mt-1.5"
              />
              <PasswordStrength score={strength} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirm"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5"
              />
              {mismatch && (
                <p className="mt-1.5 text-xs text-red-600">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Créer mon compte
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              En créant votre compte, vous acceptez les{" "}
              <a href="#" className="underline hover:text-foreground">
                CGU
              </a>{" "}
              et la{" "}
              <a href="#" className="underline hover:text-foreground">
                politique de confidentialité
              </a>{" "}
              de FleetDocs.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
