# Make a Match (Local-First)

This project runs fully local-first and does not depend on any third-party backend services.

## Run locally

1. Install dependencies:
   `npm install`
2. Start dev server:
   `npm run dev`
3. Open:
   `http://127.0.0.1:5173`

No `.env` setup is required for the local mode.

## Production build

1. Build:
   `npm run build`
2. Preview built app:
   `npm run preview`
3. Open:
   `http://127.0.0.1:4173`

## Quality checks

- Lint:
  `npm run lint`
- Build verification:
  `npm run build`

## GitHub Pages (Deprecated)

This repo previously supported Pages deploy via GitHub Actions, but it is deprecated for this project
because Pages cannot provide a shared backend database.
- workflow: `/Users/dan/Downloads/mind-circle-b40edb4e-4/.github/workflows/deploy-pages.yml`
- deploy branch trigger: `main`
- Pages build mode:
  - `VITE_BASE_PATH=/MC_app/`
  - `VITE_ROUTER_MODE=hash`

After pushing to GitHub:
1. Open repository `Settings -> Pages`.
2. Set `Source` to `GitHub Actions`.
3. Push to `main` (or run workflow manually).
4. App URL will be: `https://intergalacticuser.github.io/MC_app/`

## VPS Deployment (Recommended)

Use the built-in Node production server:
- serves `dist/`
- persists DB file on server (`data/mindcircle-shared-db.json`)

Note: the legacy shared DB endpoint is for internal demos only. For a real production deployment,
use authenticated `/api/*` endpoints.

Local commands before deploy:
1. `npm run build`
2. `npm run start:prod`

Production environment variables:
- `PORT` (default `80`)
- `HOST` (default `0.0.0.0`)
- `DATA_DIR` (default `./data`)
- `MC_LLM_PROVIDER` (default `stub`, set to `ollama` to enable local Ollama)
- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default `llama3.2:3b-instruct-q4_K_M`)
- `OLLAMA_TIMEOUT_MS` (default `30000`)

LLM health check (requires auth cookie session):
- `GET /api/integrations/llm/health`

VPS start scripts:
- `./server/bin/run-prod.sh` (loads optional `./.env`, sets sane defaults for Ollama)
- `./server/bin/run-prod-screen.sh` (runs `run-prod.sh` inside a detached `screen` session)

## Local data storage

- App data is stored in browser `localStorage`.
- Storage key: `mindcircle_local_backend_v1`.
- Active user key: `mindcircle_local_auth_user_id`.

## Admin access

- Default local admin:
  - Email: `admin@mindcircle.local`
  - Password: `admin12345`
- Default invited user password:
  - `welcome12345`

Open admin panel at:
- `http://127.0.0.1:5173/Admin`

From admin panel you can:
- view users, onboarding, premium, engagement stats
- invite users (single and bulk)
- change user role (`user` / `admin`)
- disable/enable users
- switch session into a selected user for end-to-end checks
