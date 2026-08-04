# FleetDocs — Backend FastAPI

Backend API pour la gestion de documents de flottes automobiles en Afrique francophone.

## Démarrage rapide

```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
cp .env.example .env
# Éditer .env avec votre URL PostgreSQL
python -m app.seed  # crée les tables + données de démo
uvicorn app.main:app --reload --port 8000
# API disponible sur http://localhost:8000
# Documentation sur http://localhost:8000/docs
```

## Stack technique

- **FastAPI** 0.115 — framework web asynchrone
- **SQLAlchemy 2.0** (async) — ORM avec asyncpg
- **PostgreSQL** — base de données
- **Pydantic v2** — validation des données
- **python-jose** + **passlib[bcrypt]** — authentification JWT
- **Mistral AI** (optionnel) — OCR des documents

## Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration (Pydantic Settings)
│   ├── database.py          # Engine + session SQLAlchemy
│   ├── models.py            # Modèles SQLAlchemy
│   ├── schemas.py           # Schémas Pydantic v2
│   ├── auth.py              # JWT + mots de passe
│   ├── deps.py              # Dépendances communes
│   ├── seed.py              # Script de seed
│   └── routers/
│       ├── auth.py          # Authentification, MFA, sessions
│       ├── vehicles.py      # Véhicules + statuts + timeline
│       ├── documents.py     # Documents + OCR + partages
│       ├── alerts.py        # Alertes
│       ├── dashboard.py     # KPIs + graphiques
│       ├── settings.py      # Paramètres + facturation
│       ├── exports.py       # Export PDF / Excel
│       ├── search.py        # Recherche globale
│       ├── audit-logs.py    # Journaux d'audit
│       ├── users.py         # Utilisateurs + invitations
│       ├── vehicle-types.py # Types de véhicules
│       └── document-types.py# Types de documents
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

## Authentification

JWT dans l'en-tête `Authorization: Bearer <token>`.

### Inscription (PLG)

```http
POST /api/auth/register
{
  "email": "marie.dupont@transport-dupont.sn",
  "password": "demo",
  "first_name": "Marie",
  "last_name": "Dupont",
  "company_name": "Transport Dupont SARL",
  "plan": "starter"
}
```

### Connexion

```http
POST /api/auth/login
{
  "email": "marie.dupont@transport-dupont.sn",
  "password": "demo"
}
```

Réponse :
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "...", "email": "...", "role": "admin", ... }
}
```

## Tarifs (FCFA)

| Plan         | Prix mensuel / véhicule | Véhicules max |
|--------------|------------------------:|--------------:|
| Starter      | 19 000 FCFA             | 50            |
| Pro          | 32 000 FCFA             | 200           |
| Enterprise   | Sur devis               | 1000+         |

1 € ≈ 656 FCFA

## Rôles (RBAC)

5 rôles : `super_admin`, `admin`, `manager`, `fleet_manager`, `operator`.

## Compte de démo

- **Email** : `marie.dupont@transport-dupont.sn`
- **Mot de passe** : `demo`
- **Société** : Transport Dupont SARL (Dakar, Sénégal)

## OCR (optionnel)

Si `MISTRAL_API_KEY` est définie, les documents téléversés sont envoyés à l'API Mistral pour OCR.
Sinon, le document est marqué `manual` et l'utilisateur saisit les données.

## Déploiement (Docker)

```bash
docker build -t fleetdocs-backend .
docker run -p 8000:8000 --env-file .env fleetdocs-backend
```
