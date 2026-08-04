

import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordStrength,
} from "@/components/auth/password-input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [strength, setStrength] = React.useState(0);

  const mismatch = confirm.length > 0 && pw !== confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) {
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
      toast({
        title: "Mot de passe réinitialisé",
        description: "Vous pouvez maintenant vous connecter.",
      });
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Réinitialiser le mot de passe"
      description="Choisissez un nouveau mot de passe pour votre compte."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Retour à la connexion
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <PasswordInput
            id="password"
            required
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
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
            autoComplete="new-password"
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
          Réinitialiser
        </Button>
      </form>
    </AuthShell>
  );
}
