# TradeLedger

A production-quality Progressive Web App for trading journal and analytics.

## Features

- **Dashboard** — KPI cards, performance score radar, cumulative P&L chart, monthly calendar, recent trades
- **Daily Journal** — Day-by-day collapsible cards with stats, sparklines, and notes
- **Trades** — Sortable/filterable table with bulk actions, trade detail with executions and tags
- **Manual Entry** — Multi-execution trade form with validation
- **CSV Import** — Upload, map columns, preview, and import with reusable templates
- **Reports** — Overview, by symbol, by tag, risk analysis with R-multiples and drawdown
- **Notebook** — Folder-based notes with tags and trade links
- **Settings** — Accounts, tags, theme, backup/restore, demo data

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Recharts for charts
- Zustand for state, React Router for routing
- Dexie.js (IndexedDB) offline-first database
- Supabase (optional) — email/password auth + Postgres schema with row-level security
- vite-plugin-pwa (Workbox) for PWA support
- date-fns, PapaParse, Zod

## Project Structure

```
├── frontend/            # Vite app (index.html, src/, public/, tests/)
│   └── src/
│       ├── components/  # Shared UI (layout, editor, pwa, ui)
│       ├── features/    # Feature folders (dashboard, trades, notebook, auth, …)
│       ├── stores/      # Zustand stores
│       ├── repositories/# Data access layer (Dexie)
│       └── lib/         # Pure helpers (metrics, formatters, supabaseClient)
└── backend/             # Supabase project (schema as SQL migrations, no API server)
    └── supabase/
        └── migrations/  # Versioned DDL + RLS policies
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Authentication (optional)

Login is **opt-in**: it activates only when both Supabase env vars are set, so
the app never locks you out when unconfigured.

1. Create a project at [supabase.com](https://supabase.com) and copy the
   project URL + anon key.
2. Apply the schema: `cd backend && supabase link --project-ref <ref> && supabase db push`
   (details in `backend/README.md`).
3. Copy `frontend/.env.example` → `frontend/.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

4. Restart `npm run dev` — the app now redirects to `/login` (sign in / sign
   up with confirm-password) and shows a sign-out button in the top bar.

Without `.env.local` the app runs exactly as before: fully local, no login.

## PWA

The app is installable and works fully offline. On first run, ~300 demo trades are generated over 6 months to populate all charts and pages.

## Architecture

- **Feature-based folders**: `frontend/src/features/<feature>/{components,hooks,store,types}`
- **Repository pattern**: All DB access via interfaces for future backend sync
- **Pure metric functions**: Unit-tested calculations under `frontend/src/lib/metrics`
- **Offline-first**: All data in IndexedDB, no backend required to run
- **Backend = Supabase**: schema lives as SQL migrations in `backend/supabase/migrations`, applied with the Supabase CLI; the frontend talks to Supabase directly (no API server)

## Data Model

Dexie tables: accounts, trades, executions, tags, tradeTags, dayNotes, notes, attachments, importTemplates, settings

Postgres mirrors them 1:1 (camelCase columns, `userId` + row-level security per table) — see `backend/supabase/migrations`.

All derived metrics (net P&L, R-multiple, hold time, status) are computed on-the-fly, never stored.
