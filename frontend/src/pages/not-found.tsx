import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, FileText, Truck } from "lucide-react";

export default function NotFound() {
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
          <p className="text-7xl font-bold text-primary tracking-tight">404</p>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Page introuvable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La page que vous cherchez n'existe pas, a été déplacée, ou vous n'avez
            pas les permissions nécessaires pour y accéder.
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/dashboard">
                <Home className="size-4" />
                Tableau de bord
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/vehicles">
                <Truck className="size-4" />
                Véhicules
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/documents">
                <FileText className="size-4" />
                Documents
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/search">
                <Search className="size-4" />
                Recherche
              </Link>
            </Button>
          </div>
          <Button asChild className="mt-6">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
