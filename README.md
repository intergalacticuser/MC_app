# MindCircle (Local-First)

This project now runs fully local and does not depend on Base44 services.

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

## GitHub Pages

This repo is preconfigured for Pages deploy via GitHub Actions:
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
