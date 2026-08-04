# FleetDocs Frontend

Vite + React 19 + TypeScript + Tailwind + shadcn/ui.

## Démarrage

```bash
cd frontend
bun install
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8000
bun run dev
# App at http://localhost:5173
```

## Build

```bash
bun run build
# Output in dist/
```

## Lint

```bash
bun run lint
```

## Déployer sur Vercel

1. Push to GitHub
2. Import on Vercel
3. Framework: Vite
4. Build command: `bun run build`
5. Output directory: `dist`
6. Env var: `VITE_API_URL=https://your-backend.com`

## Stack

- **Framework**: Vite 6 + React 19
- **Routing**: React Router 7
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3 + shadcn/ui (New York style, slate base)
- **State**: Zustand for client state, SWR for server state
- **Forms**: react-hook-form + zod
- **Charts**: recharts
- **Animations**: framer-motion
- **Toasts**: sonner
- **Fonts**: Inter + JetBrains Mono via @fontsource

## Pricing (FCFA)

- **Starter** — 19 000 FCFA / mois / véhicule (max 50 véhicules)
- **Pro** — 32 000 FCFA / mois / véhicule (max 200 véhicules)
- **Enterprise** — sur devis

## Structure

```
src/
├── components/
│   ├── ui/                  # shadcn/ui (New York)
│   ├── layout/              # sidebar, header, command palette, theme toggle
│   ├── auth/                # auth-shell, password-input
│   ├── dashboard/           # kpi-card, charts, recent-alerts
│   ├── vehicles/            # vehicles-table, badges, dot, qr, timeline
│   ├── documents/           # documents-table, upload-dropzone, share-links, comments
│   ├── alerts/              # alerts-table
│   ├── settings/            # all settings panels
│   ├── pricing/             # pricing cards + comparison
│   ├── marketing/           # hero, sections, header
│   ├── shared/              # status-badge
│   ├── illustrations/       # empty states
│   ├── onboarding/          # react-joyride tour
│   └── providers/           # theme-provider (no next-themes)
├── hooks/                   # use-toast, use-keyboard-shortcuts, use-saved-views, etc.
├── lib/                     # api-client, auth-context, swr, types, utils, status-config, toast
├── pages/                   # all routes (landing, pricing, auth, dashboard, etc.)
├── App.tsx                  # router config
├── main.tsx                 # entry
└── index.css                # tailwind + theme variables
```

## Auth

The frontend stores the JWT in `localStorage` (`fleetdocs_token`) and sends it
as `Authorization: Bearer <token>` on every API request. The `AuthProvider`
calls `/api/auth/me` on mount to retrieve the current user.

## API proxy

`vite.config.ts` proxies `/api/*` to `VITE_API_URL` (default `http://localhost:8000`)
in dev. In production, set `VITE_API_URL` to the public backend URL.

## Port

The dev server runs on port **5173** (proxies `/api` to backend on 8000).
