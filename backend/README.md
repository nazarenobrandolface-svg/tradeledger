# Supabase backend (schema, policies, storage)

No API server — the frontend talks to Supabase directly (PostgREST + Auth +
Storage). This folder holds the Supabase CLI project so the schema lives as
versioned SQL migrations.

## Layout

```
backend/
├── supabase/
│   ├── config.toml                 # local dev config (CLI generated)
│   └── migrations/
│       └── 20261010215500_init_schema.sql
└── README.md
```

## What the schema contains

All tables mirror the frontend's Dexie schema (`frontend/src/db/database.ts`,
version 3) 1:1, so a future sync layer is a straight mapping:

| Table              | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `accounts`         | Trading accounts                                   |
| `trades`           | Trades + planned entry/stop/target                 |
| `executions`       | Entry/exit fills per trade                         |
| `tags`             | Tag dictionary                                     |
| `trade_tags`       | Many-to-many trade ↔ tag                           |
| `note_folders`     | Notebook folders                                   |
| `notes`            | Notebook notes (rich text HTML)                    |
| `day_notes`        | Daily pre-market / post-market journal             |
| `attachments`      | Attachment metadata (bytes live in Storage)        |
| `import_templates` | CSV import column mappings                         |
| `settings`         | Per-user app settings (theme, default account, …)  |

Design notes:

- **Column names are camelCase** to match the TypeScript types exactly, so
  PostgREST responses are usable without a translation layer.
- **Timestamps are `bigint` epoch milliseconds** (`Date.now()`), not `timestamptz`.
- Every table has `"userId uuid NOT NULL DEFAULT auth.uid()` with **row-level
  security enabled** and an `own rows` policy — each user can only read/write
  their own data.
- Attachment file bytes live in the private **`attachments` Storage bucket**,
  with owner-only object policies; the `attachments` table stores metadata
  plus a `storagePath` pointing at the object.

## Setup

### 1. Prerequisites

```sh
npm i -g supabase   # or: npx supabase <cmd>
supabase --version  # 2.x
```

### 2. Link to a cloud project (recommended for the hosted app)

```sh
cd backend
supabase login
supabase link --project-ref <your-project-ref>   # ref is in your project URL
supabase db push                                 # applies migrations/*.sql
```

### 3. Or run locally (Docker required)

```sh
cd backend
supabase start        # prints local API URL + anon key
supabase db reset      # re-applies all migrations
```

### 4. Frontend credentials

Copy the project URL and anon key into the frontend env file (see
`frontend/.env.example`):

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

With those two variables set, the app shows the login screen and gates the
routes. **Without them nothing breaks** — the app runs exactly as before,
fully local in IndexedDB.

## Applying a new migration

```sh
cd backend
supabase migration new add_some_column   # creates migrations/<ts>_add_some_column.sql
# edit the file, then:
supabase db push                          # cloud
supabase db reset                         # local
```
