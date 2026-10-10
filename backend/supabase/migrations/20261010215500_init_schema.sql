-- TradeLedger initial schema
--
-- Mirrors the frontend's Dexie schema (frontend/src/db/database.ts, v3) so a
-- future sync layer can map tables 1:1. Column names are camelCase to match
-- the TypeScript types exactly — Supabase/PostgREST then returns rows the app
-- can use without a translation layer.
--
-- Timestamps are bigint epoch milliseconds (the app stores Date.now()), and
-- every table carries a "userId" defaulting to auth.uid() with row-level
-- security so a user can only ever read/write their own rows.

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  "startingBalance" double precision not null default 0,
  timezone text not null default 'UTC',
  "commissionPerTrade" double precision not null default 0,
  "commissionPerShare" double precision not null default 0,
  "isDefault" boolean not null default false,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

-- ---------------------------------------------------------------------------
-- Trades + executions
-- ---------------------------------------------------------------------------
create table if not exists public.trades (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "accountId" text not null references public.accounts (id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  status text not null check (status in ('open', 'closed')),
  "openedAt" bigint not null,
  "closedAt" bigint,
  "plannedEntry" double precision,
  "plannedStop" double precision,
  "plannedTarget" double precision,
  rating double precision,
  notes text not null default '',
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

create table if not exists public.executions (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "tradeId" text not null references public.trades (id) on delete cascade,
  type text not null check (type in ('entry', 'exit')),
  price double precision not null,
  quantity double precision not null,
  fees double precision not null default 0,
  "executedAt" bigint not null,
  note text
);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6C5CE7',
  category text not null default 'custom',
  "createdAt" bigint not null
);

create table if not exists public.trade_tags (
  "tradeId" text not null references public.trades (id) on delete cascade,
  "tagId" text not null references public.tags (id) on delete cascade,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key ("tradeId", "tagId")
);

-- ---------------------------------------------------------------------------
-- Notes (folders, notebook notes, daily journal notes)
-- ---------------------------------------------------------------------------
create table if not exists public.note_folders (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  "createdAt" bigint not null
);

create table if not exists public.day_notes (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "accountId" text references public.accounts (id) on delete cascade,
  date text not null,
  "preMarketPlan" text not null default '',
  "postMarketReview" text not null default '',
  mood text,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

create table if not exists public.notes (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  "folderId" text references public.note_folders (id) on delete set null,
  tags jsonb not null default '[]'::jsonb,
  "linkedTradeIds" jsonb not null default '[]'::jsonb,
  "linkedDates" jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

-- ---------------------------------------------------------------------------
-- Attachments (file bytes live in the storage bucket below)
-- ---------------------------------------------------------------------------
create table if not exists public.attachments (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "noteId" text references public.notes (id) on delete cascade,
  "tradeId" text references public.trades (id) on delete cascade,
  "dayNoteId" text references public.day_notes (id) on delete cascade,
  "fileName" text not null,
  mimeType text not null,
  size bigint not null default 0,
  "storagePath" text,
  "createdAt" bigint not null
);

-- ---------------------------------------------------------------------------
-- Settings + import templates
-- ---------------------------------------------------------------------------
create table if not exists public.import_templates (
  id text primary key,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  broker text not null default '',
  "columnMapping" jsonb not null default '{}'::jsonb,
  "hasHeader" boolean not null default true,
  delimiter text not null default ',',
  "createdAt" bigint not null
);

create table if not exists public.settings (
  key text not null,
  "userId" uuid not null default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  "sidebarCollapsed" boolean not null default false,
  "defaultAccountId" text,
  "lastDateRange" jsonb,
  seeded boolean not null default false,
  primary key ("userId", key)
);

-- ---------------------------------------------------------------------------
-- Indexes (also keep row-level security checks cheap)
-- ---------------------------------------------------------------------------
create index if not exists accounts_user_idx on public.accounts ("userId");
create index if not exists trades_user_idx on public.trades ("userId");
create index if not exists trades_account_idx on public.trades ("accountId");
create index if not exists trades_opened_idx on public.trades ("openedAt");
create index if not exists executions_user_idx on public.executions ("userId");
create index if not exists executions_trade_idx on public.executions ("tradeId");
create index if not exists tags_user_idx on public.tags ("userId");
create index if not exists trade_tags_user_idx on public.trade_tags ("userId");
create index if not exists trade_tags_tag_idx on public.trade_tags ("tagId");
create index if not exists note_folders_user_idx on public.note_folders ("userId");
create index if not exists day_notes_user_idx on public.day_notes ("userId");
create index if not exists day_notes_date_idx on public.day_notes (date);
create index if not exists notes_user_idx on public.notes ("userId");
create index if not exists notes_folder_idx on public.notes ("folderId");
create index if not exists attachments_user_idx on public.attachments ("userId");
create index if not exists attachments_note_idx on public.attachments ("noteId");
create index if not exists import_templates_user_idx on public.import_templates ("userId");
create index if not exists settings_user_idx on public.settings ("userId");

-- ---------------------------------------------------------------------------
-- Row-level security: each user sees exactly their own rows
-- ---------------------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.trades enable row level security;
alter table public.executions enable row level security;
alter table public.tags enable row level security;
alter table public.trade_tags enable row level security;
alter table public.note_folders enable row level security;
alter table public.day_notes enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;
alter table public.import_templates enable row level security;
alter table public.settings enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'accounts', 'trades', 'executions', 'tags', 'trade_tags',
    'note_folders', 'day_notes', 'notes', 'attachments',
    'import_templates', 'settings'
  ]
  loop
    execute format(
      'drop policy if exists "own rows" on public.%I',
      tbl
    );
    execute format(
      'create policy "own rows" on public.%I for all using ("userId" = auth.uid()) with check ("userId" = auth.uid())',
      tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Attachments bucket: private, readable/writable only by the owner
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "attachment owner read" on storage.objects;
create policy "attachment owner read" on storage.objects
  for select using (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists "attachment owner write" on storage.objects;
create policy "attachment owner write" on storage.objects
  for insert with check (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists "attachment owner update" on storage.objects;
create policy "attachment owner update" on storage.objects
  for update using (bucket_id = 'attachments' and owner = auth.uid());

drop policy if exists "attachment owner delete" on storage.objects;
create policy "attachment owner delete" on storage.objects
  for delete using (bucket_id = 'attachments' and owner = auth.uid());
