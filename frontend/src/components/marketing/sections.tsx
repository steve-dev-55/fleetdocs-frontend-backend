

import * as React from "react";
import { Link } from "react-router-dom";
import { FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const valueProps = [
  {
    icon: FileText,
    title: "Upload & saisie manuelle",
    description:
      "Uploadez vos cartes grises, assurances et contrôles techniques. Renseignez les dates clés et recevez des alertes avant expiration.",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    icon: ShieldAlert,
    title: "Alertes avant expiration",
    description:
      "Recevez des notifications J-90, J-60, J-30, J-15 et J-7 par email et dans l'app. Plus aucun document expiré par oubli.",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    icon: ShieldCheck,
    title: "Conformité RGPD & exports",
    description:
      "Export PDF/Excel, audit trail complet, hébergement en Union Européenne. Prêt pour les contrôles DSF et UTPC.",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/40",
  },
];

export function ValueProps() {
  return (
    <section className="py-20 sm:py-28 bg-background" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">
            Pourquoi FleetDocs
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Tout ce qu'il faut pour rester conforme
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Conçu par et pour les responsables de flotte. Moins de temps sur la paperasse, plus de temps sur la route.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {valueProps.map((vp) => (
            <Card
              key={vp.title}
              className="shadow-sm hover:shadow-md transition-shadow rounded-xl"
            >
              <CardContent className="pt-6">
                <div
                  className={`size-12 rounded-lg flex items-center justify-center ${vp.bg} ${vp.color}`}
                >
                  <vp.icon className="size-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  {vp.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {vp.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    n: "1",
    title: "Créez votre compte",
    description: "Inscription en 2 minutes, premier véhicule ajouté en 5.",
  },
  {
    n: "2",
    title: "Ajoutez vos véhicules",
    description: "Immatriculation, marque, modèle. Ou importez un fichier CSV.",
  },
  {
    n: "3",
    title: "Uploadez vos documents",
    description:
      "Glissez-déposez vos PDF et renseignez les dates.",
  },
  {
    n: "4",
    title: "Recevez les alertes",
    description:
      "Notifications J-90 à J-7 par email. Tableau de bord temps réel.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-muted/40" id="how">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">
            Comment ça marche
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Conformité en 4 étapes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            De l'inscription au premier véhicule conforme en moins de 10 minutes.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="flex items-center gap-4 sm:flex-col sm:items-start">
                <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-5 left-[60%] w-[40%] h-px bg-border"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Comment ajouter un document ?",
    a: "Uploadez votre fichier (PDF, image), puis remplissez le formulaire avec le type de document, les dates d'émission et d'expiration, et la référence. Le système calcule automatiquement le statut de validité et crée des alertes avant expiration.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Vos données sont hébergées en Union Européenne (OVHcloud, Roubaix). Chiffrement au repos (AES-256) et en transit (TLS 1.3). Sauvegardes quotidiennes. Conformité RGPD : registre des traitements, droit à l'oubli, export complet à tout moment.",
  },
  {
    q: "Puis-je exporter mes données ?",
    a: "Oui. Export PDF, Excel (XLSX) et CSV disponible à tout moment sur les véhicules, documents et alertes. Format compatible avec les outils de gestion de flotte existants (Cartograph, Geofleet, etc.).",
  },
  {
    q: "Quels types de documents sont supportés ?",
    a: "Carte grise, assurance, contrôle technique, FIMO, FCO, ADR, licence de transport, carte flux, attestation de capacité, et plus. Vous pouvez créer des types personnalisés avec leurs propres règles d'alerte.",
  },
  {
    q: "Comment fonctionne la facturation ?",
    a: "Facturation mensuelle ou annuelle (-20%). Tarification au véhicule. Vous ne payez que pour ce que vous utilisez. Mise à niveau et rétrogradation immédiates, prorata automatique. Stripe pour la sécurité des paiements.",
  },
  {
    q: "Y a-t-il un essai gratuit ?",
    a: "Oui. Le plan Starter est gratuit jusqu'à 3 véhicules, sans limite de durée ni carte bancaire. Idéal pour tester avant de passer au Pro.",
  },
  {
    q: "Puis-je inviter mon équipe ?",
    a: "Bien sûr. Le plan Pro inclut jusqu'à 10 utilisateurs, Enterprise jusqu'à 100. Rôles : Administrateur, Manager, Opérateur, Lecteur. Chaque rôle a ses permissions. Invitations par email avec lien sécurisé valable 7 jours.",
  },
  {
    q: "Que se passe-t-il si un document expire ?",
    a: "Vous recevez des alertes J-90, J-60, J-30, J-15 et J-7 par email et dans l'app. Le véhicule passe en alerte orange (J-30), puis rouge (expiré). Le tableau de bord affiche le taux de conformité en temps réel. Personnalisez les jours d'alerte par type de document.",
  },
];

export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section className="py-20 sm:py-28 bg-background" id="faq">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Questions fréquentes
          </h2>
        </div>
        <div className="mt-12 divide-y divide-border rounded-xl border bg-card overflow-hidden">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-foreground">
                    {f.q}
                  </span>
                  <span
                    className={`ml-4 text-primary transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CtaFinal() {
  return (
    <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Prêt à automatiser votre conformité documentaire ?
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Rejoignez les 200+ gestionnaires de flotte qui ont déjà gagné 5h par semaine avec FleetDocs.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary-foreground text-primary px-6 py-3 text-sm font-semibold hover:bg-primary-foreground/90 transition-colors"
          >
            Démarrer gratuitement
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-md border border-primary-foreground/40 px-6 py-3 text-sm font-semibold hover:bg-primary-foreground/10 transition-colors"
          >
            Voir les tarifs
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
                F
              </div>
              <span className="text-lg font-semibold text-foreground">
                FleetDocs
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              La conformité documentaire de votre flotte, sans effort. Conçu pour les transporteurs français.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Tarifs</Link></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Sécurité</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Société</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">À propos</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Carrières</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Légal</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">CGU</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">CGV</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Confidentialité</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Mentions légales</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="text-muted-foreground">
                <a href="mailto:support@fleetdocs.com" className="hover:text-foreground transition-colors">support@fleetdocs.com</a>
              </li>
              <li className="text-muted-foreground">+33 1 23 45 67 89</li>
              <li className="text-muted-foreground">12 rue des Transporteurs<br />59000 Lille</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 FleetDocs SAS. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Hébergé en France 🇫🇷 — Conforme RGPD
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LogosStrip() {
  return (
    <section className="py-12 bg-background border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Ils gèrent leur conformité avec FleetDocs
        </p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center opacity-70">
          {[
            "TransExpress",
            "LogiRoute",
            "FretDirect",
            "CargoNet",
            "MobilPro",
            "Routage+",
          ].map((name) => (
            <div
              key={name}
              className="text-center text-base font-semibold text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
