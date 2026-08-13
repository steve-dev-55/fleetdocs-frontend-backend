
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiPost, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    company_name: "",
    plan: "starter",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "Prénom requis";
    if (!form.last_name.trim()) e.last_name = "Nom requis";
    if (!form.email.trim()) e.email = "Email requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email invalide";
    if (form.password.length < 8)
      e.password = "Minimum 8 caractères";
    if (!form.company_name.trim())
      e.company_name = "Nom de l'entreprise requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await apiPost("/api/auth/register", {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name,
        plan: form.plan,
        role: "admin",
      });
      appToast.success("Compte créé", {
        description: "Votre compte est prêt. Connectez-vous pour commencer.",
      });
      navigate("/login");
    } catch (err) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const plans = [
    {
      value: "starter",
      label: "Starter",
      price: "19 000 FCFA/mois",
      max: "50 véhicules",
      features: ["Documents illimités", "Alertes d'expiration", "1 utilisateur", "Support email"],
    },
    {
      value: "pro",
      label: "Pro",
      price: "32 000 FCFA/mois",
      max: "200 véhicules",
      features: ["Tout Starter", "Utilisateurs illimités", "Rôles & permissions", "Export PDF/Excel", "Support prioritaire"],
      popular: true,
    },
  ];

  return (
    <AuthShell
      title="Créer un compte"
      description="Inscrivez-vous et gérez votre flotte en quelques minutes."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name">Prénom *</Label>
            <Input
              id="first_name"
              required
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="mt-1.5"
              placeholder="Marie"
            />
            {errors.first_name && (
              <p className="mt-1 text-xs text-destructive">{errors.first_name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="last_name">Nom *</Label>
            <Input
              id="last_name"
              required
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className="mt-1.5"
              placeholder="Dupont"
            />
            {errors.last_name && (
              <p className="mt-1 text-xs text-destructive">{errors.last_name}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1.5"
            placeholder="vous@entreprise.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <Label htmlFor="company_name">Entreprise *</Label>
          <Input
            id="company_name"
            required
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            className="mt-1.5"
            placeholder="Transport Dupont SARL"
          />
          {errors.company_name && (
            <p className="mt-1 text-xs text-destructive">{errors.company_name}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password">Mot de passe *</Label>
          <Input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="mt-1.5"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Minimum 8 caractères
          </p>
        </div>

        {/* Plan selection */}
        <div>
          <Label>Choisissez votre plan</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {plans.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, plan: p.value }))}
                className={`relative text-left rounded-lg border-2 p-3 transition-all ${
                  form.plan === p.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Populaire
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {p.label}
                  </span>
                  {form.plan === p.value && (
                    <CheckCircle2 className="size-4 text-primary" />
                  )}
                </div>
                <p className="text-xs font-medium text-foreground mt-1">
                  {p.price}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.max}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Créer mon compte
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          En créant un compte, vous acceptez nos{" "}
          <Link to="/legal" className="underline hover:text-primary">
            conditions d'utilisation
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
