# FleetDocs — Architecture frontend + backend séparés

SaaS de gestion documentaire de flottes automobiles pour l'Afrique francophone.

## Structure

```
fleetdocs/
├── frontend/          # Vite + React 19 + TypeScript + Tailwind + shadcn/ui
├── backend/           # FastAPI + SQLAlchemy + PostgreSQL + JWT auth
├── docker-compose.yml # Tout-en-un pour dev local
└── README.md
```

## Démarrage rapide (Docker Compose — recommandé)

```bash
docker-compose up --build
```

- Frontend : http://localhost:5173
- Backend API : http://localhost:8000
- API docs (Swagger) : http://localhost:8000/docs
- Login démo : marie.dupont@transport-dupont.sn / demo

## Démarrage manuel (sans Docker)

### 1. Base de données PostgreSQL

```bash
# Option A: Docker
docker run -d --name fleetdocs-db -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fleetdocs postgres:16-alpine

# Option B: Neon/Supabase (cloud, free tier)
# Copier l'URL de connexion
```

### 2. Backend FastAPI

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Éditer DATABASE_URL
python -m app.seed          # Crée les tables + données démo
uvicorn app.main:app --reload --port 8000
```

API disponible sur http://localhost:8000
Docs Swagger sur http://localhost:8000/docs

### 3. Frontend Vite

```bash
cd frontend
bun install                 # ou npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8000
bun run dev                 # ou npm run dev
```

App sur http://localhost:5173

## Tarification (FCFA)

| Plan | Prix/mois/véhicule | Véhicules max | Features |
|------|---------------------|---------------|----------|
| Starter | 19 000 FCFA | 50 | Core features |
| Pro | 32 000 FCFA | 200 | + Bulk actions, exports, API |
| Enterprise | Sur devis | 1000+ | + SSO, SLA, support dédié |

Annuel : -20% (19 000 × 12 × 0.8 = 182 400 FCFA/an)

## Stack technique

### Frontend
- Vite 5 + React 19 + TypeScript 5
- Tailwind CSS 3 + shadcn/ui (New York)
- React Router v7
- SWR (data fetching)
- Recharts (charts)
- react-dropzone (upload)
- framer-motion (animations)
- qrcode.react (QR codes)
- Inter + JetBrains Mono (fonts)

### Backend
- FastAPI 0.115 + Python 3.12
- SQLAlchemy 2.0 (async) + asyncpg
- PostgreSQL 16
- python-jose (JWT) + passlib/bcrypt
- Pydantic v2 (validation)
- Mistral AI (OCR, optionnel)
- Uvicorn (ASGI server)

## Déploiement

### Frontend → Vercel

```bash
cd frontend
bun run build
# Output: dist/
# Vercel: import repo, framework=Vite, build=bun run build, output=dist
# Env var: VITE_API_URL=https://your-backend.com
```

### Backend → VPS / Railway / Render / Fly.io

```bash
cd backend
# Build Docker image
docker build -t fleetdocs-backend .
# Run
docker run -p 8000:8000 --env-file .env fleetdocs-backend
```

Ou déployer sur :
- **Railway** : connect repo, auto-deploy
- **Render** : web service, Python 3.12, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Fly.io** : `fly launch` puis `fly deploy`

### Base de données → Neon / Supabase

- Neon : https://neon.tech (free 0.5 GB)
- Supabase : https://supabase.com (free 500 MB)

## Fonctionnalités (60/60 recommandations UI/UX)

### P0 Critiques (14)
- ✅ UI Upload documents (dropzone + multi-file + OCR)
- ✅ 3 pages auth (forgot/reset/accept-invitation)
- ✅ Operator redirect fix
- ✅ Status codes traduits FR
- ✅ Fonts Inter + JetBrains Mono
- ✅ Search wired, SPA navigation, download button

### P1 Hautes (20)
- ✅ Landing page MVP, pricing, billing
- ✅ Command palette ⌘K, global search
- ✅ shadcn components, light theme, ThemeProvider
- ✅ Conformité column, bulk actions, CSV export
- ✅ /settings 5 onglets, tooltips, 404, error boundary

### P2 Moyennes (16)
- ✅ Saved views, column toggle, page size
- ✅ QR codes, custom fields, photo upload
- ✅ Timeline unifiée, comments, share links
- ✅ MFA TOTP, SSO buttons, sessions
- ✅ Scheduled reports, audit logs, Slack/Teams
- ✅ Keyboard shortcuts

### P3 Faibles (10)
- ✅ Custom illustrations, onboarding tour
- ✅ Optimistic UI, route animations
- ✅ Toast undo, toast categories
- ✅ Sidebar slim, alert badge, A/B testing

## Login démo

- Email : marie.dupont@transport-dupont.sn
- Mot de passe : demo

## Support

- Email : support@fleetdocs.africa
- Documentation : voir `backend/README.md` et `frontend/README.md`
