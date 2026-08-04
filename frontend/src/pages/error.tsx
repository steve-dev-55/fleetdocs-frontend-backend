

import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-4 sm:px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-foreground">
          <div className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
            F
          </div>
          <span className="text-lg font-semibold">FleetDocs</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="size-14 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto">
            <AlertTriangle className="size-7 text-amber-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Une erreur est survenue
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Désolé, quelque chose s'est mal passé. Notre équipe a été notifiée.
            Vous pouvez réessayer ou revenir à l'accueil.
          </p>
          {error.digest && (
            <p className="mt-3 text-xs text-muted-foreground font-mono">
              Référence : {error.digest}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={reset}>
              <RotateCcw className="size-4" />
              Réessayer
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
