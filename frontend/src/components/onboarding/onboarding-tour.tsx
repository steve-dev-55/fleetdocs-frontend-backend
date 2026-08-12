

// FleetDocs — Onboarding tour (P3-2)
// 5-step tour using react-joyride v2. Triggered on first login.

import * as React from "react";
import Joyride, { STATUS, type Step, type CallBackProps } from "react-joyride";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "fleetdocs-onboarding-completed";

const STEPS: Step[] = [
  {
    target: "[data-tour='kpi-cards']",
    content:
      "Voici vos indicateurs clés : nombre de véhicules, taux de conformité, alertes actives. Cliquez sur 30j / 90j / 12 mois pour changer la période.",
    title: "Bienvenue sur FleetDocs ! 🎉",
    disableBeacon: true,
  },
  {
    target: "[data-tour='sidebar-vehicles']",
    content:
      "Vos véhicules sont ici. Cliquez pour voir la liste complète, filtrer, ajouter un véhicule ou consulter une fiche détaillée.",
    title: "Navigation",
  },
  {
    target: "[data-tour='upload-button']",
    content:
      "Uploadez vos documents (carte grise, assurance, contrôle technique) ici. Uploadez vos documents et renseignez les dates d'expiration.",
    title: "Uploader des documents",
  },
  {
    target: "[data-tour='alerts-bell']",
    content:
      "Les alertes apparaissent ici. Cliquez sur la cloche pour voir toutes les alertes (documents expirants, véhicules en panne, etc.).",
    title: "Alertes",
  },
  {
    target: "[data-tour='user-menu']",
    content:
      "Configurez votre compte, votre entreprise, la facturation, la sécurité et les notifications dans ce menu.",
    title: "Paramètres",
  },
];

export function OnboardingTour() {
  const { pathname } = useLocation();
  const [run, setRun] = React.useState(false);

  React.useEffect(() => {
    // Only run on /dashboard
    if (pathname !== "/dashboard") return;
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        const t = setTimeout(() => setRun(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  const handleEvent = React.useCallback((data: CallBackProps) => {
    const { status, action } = data;
    if (action === "close") {
      setRun(false);
      try {
        localStorage.setItem(STORAGE_KEY, "skipped");
      } catch {}
      return;
    }
    if (
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      setRun(false);
      try {
        localStorage.setItem(STORAGE_KEY, "completed");
      } catch {}
    }
  }, []);

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      callback={handleEvent}
      locale={{
        back: "Précédent",
        close: "Fermer",
        last: "Terminer",
        next: "Suivant",
        skip: "Ne plus montrer",
      }}
      styles={{
        options: {
          primaryColor: "#2563eb",
          backgroundColor: "#ffffff",
          textColor: "#111827",
          arrowColor: "#ffffff",
          overlayColor: "rgba(17, 24, 39, 0.5)",
          zIndex: 9999,
        },
        tooltip: {
          borderRadius: "12px",
        },
      }}
    />
  );
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
