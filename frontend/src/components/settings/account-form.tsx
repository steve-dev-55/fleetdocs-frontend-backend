

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PasswordInput,
  PasswordStrength,
} from "@/components/auth/password-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Save, KeyRound } from "lucide-react";

export function AccountForm() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [loadingPw, setLoadingPw] = React.useState(false);
  const [firstName, setFirstName] = React.useState(user?.first_name ?? "");
  const [lastName, setLastName] = React.useState(user?.last_name ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [strength, setStrength] = React.useState(0);

  async function onProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      updateUser({ first_name: firstName, last_name: lastName, email });
      toast({ title: "Profil mis à jour" });
    } finally {
      setLoadingProfile(false);
    }
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }
    setLoadingPw(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setStrength(0);
      toast({ title: "Mot de passe modifié" });
    } finally {
      setLoadingPw(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loadingProfile}>
                {loadingProfile ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="size-4" />
            Mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPassword} className="space-y-4">
            <div>
              <Label htmlFor="current_pw">Mot de passe actuel</Label>
              <PasswordInput
                id="current_pw"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="new_pw">Nouveau mot de passe</Label>
              <PasswordInput
                id="new_pw"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onStrengthChange={setStrength}
                className="mt-1.5"
              />
              <PasswordStrength score={strength} />
            </div>
            <div>
              <Label htmlFor="confirm_pw">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirm_pw"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loadingPw}>
                {loadingPw ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
