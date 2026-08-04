

import * as React from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      setSent(true);
      toast({
        title: "Email envoyé",
        description: `Un lien de réinitialisation a été envoyé à ${email}`,
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Email envoyé"
        description="Vérifiez votre boîte de réception."
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
        <div className="text-center py-4">
          <div className="size-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-7 text-green-600" />
          </div>
          <p className="mt-4 text-sm text-foreground">
            Si un compte existe pour{" "}
            <span className="font-semibold">{email}</span>, vous recevrez un
            email avec un lien de réinitialisation dans les prochaines minutes.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Pensez à vérifier vos spams. Le lien expire dans 1 heure.
          </p>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => setSent(false)}
          >
            Renvoyer un email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Entrez votre email pour recevoir un lien de réinitialisation."
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
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.fr"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Envoyer le lien
        </Button>
      </form>
    </AuthShell>
  );
}
