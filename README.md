# TradeLedger

A production-quality Progressive Web App for trading journal and analytics.

## Features

- **Dashboard** — KPI cards, performance score radar, cumulative P&L chart, monthly calendar, recent trades
- **Daily Journal** — Day-by-day collapsible cards with stats, sparklines, and notes
- **Trades** — Sortable/filterable table with bulk actions, trade detail with executions and tags
- **Manual Entry** — Multi-execution trade form with validation
- **CSV Import** — Upload, map columns, preview, and import with reusable templates
- **Reports** — Overview, by symbol, by setup, risk analysis with R-multiples and drawdown
- **Playbooks** — Strategy definitions with rule checklists and per-playbook stats
- **Notebook** — Folder-based notes with tags and trade links
- **Settings** — Accounts, tags, theme, backup/restore, demo data

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Recharts for charts
- Zustand for state, React Router for routing
- Dexie.js (IndexedDB) offline-first database
- vite-plugin-pwa (Workbox) for PWA support
- date-fns, PapaParse, Zod

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

## PWA

The app is installable and works fully offline. On first run, ~300 demo trades are generated over 6 months to populate all charts and pages.

## Architecture

- **Feature-based folders**: `/src/features/<feature>/{components,hooks,store,types}`
- **Repository pattern**: All DB access via interfaces for future backend sync
- **Pure metric functions**: Unit-tested calculations under `/src/lib/metrics`
- **Offline-first**: All data in IndexedDB, no backend required

## Data Model

Dexie tables: accounts, trades, executions, tags, tradeTags, playbooks, playbookRules, dayNotes, notes, attachments, importTemplates, settings

All derived metrics (net P&L, R-multiple, hold time, status) are computed on-the-fly, never stored.
