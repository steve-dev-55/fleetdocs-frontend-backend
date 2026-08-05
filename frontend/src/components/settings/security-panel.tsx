

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QRCodeCanvas } from "qrcode.react";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import {
  Shield,
  Smartphone,
  Monitor,
  LogOut,
  ShieldCheck,
  Copy,
  Check,
  Fingerprint,
  Loader2,
} from "lucide-react";

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  last_active: string;
  current: boolean;
}

interface SocialConnection {
  provider: "google" | "microsoft";
  connected: boolean;
  email?: string;
  connected_at?: string;
}

function formatLastActive(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Maintenant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

const DEVICE_ICONS: Record<string, React.ElementType> = {
  MacBook: Monitor,
  iPhone: Smartphone,
  iPad: Smartphone,
  Windows: Monitor,
};

function getDeviceIcon(device: string): React.ElementType {
  const key = Object.keys(DEVICE_ICONS).find((k) => device.includes(k));
  return key ? DEVICE_ICONS[key] : Monitor;
}

export function SecurityPanel() {
  const [mfaEnabled, setMfaEnabled] = React.useState(false);
  const [mfaBackupCodes, setMfaBackupCodes] = React.useState<string[]>([]);
  const [mfaDialogOpen, setMfaDialogOpen] = React.useState(false);
  const [mfaStep, setMfaStep] = React.useState<"qr" | "code" | "backup">("qr");
  const [mfaSecret, setMfaSecret] = React.useState("");
  const [otpauthUrl, setOtpauthUrl] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [codesCopied, setCodesCopied] = React.useState(false);

  const [connections, setConnections] = React.useState<SocialConnection[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);

  const loadAll = React.useCallback(async () => {
    try {
      const mfa = await apiGet<{
        enabled: boolean;
        backup_codes_remaining?: number;
      }>("/api/settings/mfa");
      setMfaEnabled(mfa.enabled);
      const sso = await apiGet<{ connections: SocialConnection[] }>(
        "/api/settings/sso"
      );
      setConnections(sso.connections);
      const sess = await apiGet<{ sessions: Session[] }>(
        "/api/settings/sessions"
      );
      setSessions(sess.sessions);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ---- MFA flow ----
  const startMfaSetup = async () => {
    setMfaDialogOpen(true);
    setMfaStep("qr");
    setVerificationCode("");
    setCodesCopied(false);
    try {
      const data = await apiPost<{ secret: string; otpauth_url: string }>(
        "/api/settings/mfa",
        { action: "setup" }
      );
      setMfaSecret(data.secret);
      setOtpauthUrl(data.otpauth_url);
    } catch {
      appToast.error("Erreur lors de la configuration");
    }
  };

  const verifyMfa = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      appToast.error("Code invalide (6 chiffres requis)");
      return;
    }
    try {
      const data = await apiPost<{
        success: boolean;
        backup_codes: string[];
      }>("/api/settings/mfa", {
        action: "verify",
        secret: mfaSecret,
        code: verificationCode,
      });
      if (data.success) {
        setMfaBackupCodes(data.backup_codes);
        setMfaEnabled(true);
        setMfaStep("backup");
        appToast.success("2FA activée avec succès");
      }
    } catch (err) {
      appToast.error("Code invalide");
    }
  };

  const disableMfa = async () => {
    try {
      await apiPost("/api/settings/mfa", { action: "disable" });
      setMfaEnabled(false);
      setMfaBackupCodes([]);
      appToast.success("2FA désactivée");
    } catch {
      appToast.error("Erreur");
    }
  };

  const copyCodes = () => {
    void navigator.clipboard.writeText(mfaBackupCodes.join("\n")).then(() => {
      setCodesCopied(true);
      appToast.success("Codes copiés");
      setTimeout(() => setCodesCopied(false), 2000);
    });
  };

  // ---- SSO ----
  const toggleSso = async (
    provider: "google" | "microsoft",
    action: "connect" | "disconnect"
  ) => {
    try {
      await apiPost("/api/settings/sso", { provider, action });
      await loadAll();
      appToast.success(
        action === "connect"
          ? `${provider === "google" ? "Google" : "Microsoft"} connecté`
          : `${provider === "google" ? "Google" : "Microsoft"} déconnecté`
      );
    } catch {
      appToast.error("Erreur");
    }
  };

  // ---- Sessions ----
  const revokeOthers = async () => {
    try {
      const data = await apiPost<{ success: boolean; revoked: number }>(
        "/api/settings/sessions",
        {}
      );
      await loadAll();
      appToast.success(`${data.revoked} session(s) déconnectée(s)`);
    } catch {
      appToast.error("Erreur");
    }
  };

  return (
    <div className="space-y-6">
      {/* MFA Section */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4" />
            Authentification à deux facteurs (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-foreground">
                Sécurisez votre compte avec une seconde authentification TOTP.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compatible Google Authenticator, Authy, 1Password, etc.
              </p>
              {mfaEnabled && (
                <Badge className="mt-3 bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900">
                  <ShieldCheck className="size-3 mr-1" />
                  2FA activée
                </Badge>
              )}
            </div>
            {mfaEnabled ? (
              <Button variant="outline" onClick={() => void disableMfa()}>
                Désactiver
              </Button>
            ) : (
              <Button onClick={() => void startMfaSetup()}>
                <Fingerprint className="size-4" />
                Activer la 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SSO Section */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="size-4" />
            Connexion sociale (SSO)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connectez vos comptes Google ou Microsoft pour vous connecter en un clic.
          </p>
          {connections.map((conn) => {
            const isGoogle = conn.provider === "google";
            return (
              <div
                key={conn.provider}
                className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-9 rounded-md flex items-center justify-center ${
                      isGoogle
                        ? "bg-red-50 dark:bg-red-950/30 text-red-600"
                        : "bg-blue-50 dark:bg-blue-950/30 text-blue-600"
                    }`}
                  >
                    {isGoogle ? <GoogleIcon /> : <MicrosoftIcon />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isGoogle ? "Google" : "Microsoft"}
                    </p>
                    {conn.connected ? (
                      <p className="text-xs text-muted-foreground">
                        Connecté à {conn.email}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Non connecté</p>
                    )}
                  </div>
                </div>
                {conn.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleSso(conn.provider, "disconnect")}
                  >
                    Déconnecter
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleSso(conn.provider, "connect")}
                  >
                    Connecter
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sessions Section */}
      <Card className="rounded-xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="size-4" />
            Sessions actives
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void revokeOthers()}
            disabled={sessions.length <= 1}
          >
            <LogOut className="size-4" />
            Déconnecter les autres appareils
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin -mx-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">Appareil</TableHead>
                  <TableHead className="hidden md:table-cell">Navigateur</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead className="hidden md:table-cell">IP</TableHead>
                  <TableHead>Dernière activité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const Icon = getDeviceIcon(s.device);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {s.device}
                          </span>
                          {s.current && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-200 dark:border-green-900"
                            >
                              Cet appareil
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.os}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.browser}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.location}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">
                        {s.ip}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastActive(s.last_active)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MFA Setup Dialog */}
      <Dialog
        open={mfaDialogOpen}
        onOpenChange={(v) => {
          setMfaDialogOpen(v);
          if (!v && !mfaEnabled) {
            // User cancelled before completing setup
            setMfaStep("qr");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Configuration 2FA
            </DialogTitle>
            <DialogDescription>
              {mfaStep === "qr" && "Étape 1 sur 3 : Scannez le QR code"}
              {mfaStep === "code" && "Étape 2 sur 3 : Entrez le code de vérification"}
              {mfaStep === "backup" && "Étape 3 sur 3 : Sauvegardez vos codes"}
            </DialogDescription>
          </DialogHeader>

          {mfaStep === "qr" && (
            <div className="space-y-4 py-2">
              <div className="flex justify-center">
                <div className="p-4 rounded-lg border border-border bg-white">
                  {otpauthUrl && (
                    <QRCodeCanvas value={otpauthUrl} size={180} level="M" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Ou saisissez manuellement la clé :
                </p>
                <div className="flex items-center justify-center gap-1">
                  <code className="text-xs font-mono px-2 py-1 rounded bg-muted">
                    {mfaSecret}
                  </code>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(mfaSecret);
                          }}
                          className="size-7 inline-flex items-center justify-center rounded hover:bg-muted"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copier la clé</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setMfaStep("code")}>Continuer</Button>
              </DialogFooter>
            </div>
          )}

          {mfaStep === "code" && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Entrez le code à 6 chiffres affiché par votre application TOTP.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                className="text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                autoFocus
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setMfaStep("qr")}>
                  Retour
                </Button>
                <Button
                  onClick={() => void verifyMfa()}
                  disabled={verificationCode.length !== 6}
                >
                  Vérifier & activer
                </Button>
              </DialogFooter>
            </div>
          )}

          {mfaStep === "backup" && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ Conservez ces codes en lieu sûr. Ils vous permettront d'accéder à votre compte si vous perdez votre téléphone.
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md border border-border bg-muted/30">
                {mfaBackupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="font-mono text-sm text-center text-foreground"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => void copyCodes()}>
                  {codesCopied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  Copier les codes
                </Button>
                <Button
                  onClick={() => {
                    setMfaDialogOpen(false);
                    appToast.success("2FA activée");
                  }}
                >
                  J'ai sauvegardé les codes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
