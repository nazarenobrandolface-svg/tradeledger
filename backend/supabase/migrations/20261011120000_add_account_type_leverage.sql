-- Trading account type (live / prop firm / demo) and broker leverage.
-- Mirrors Account.type / Account.leverage in the frontend
-- (frontend/src/types/trade.ts). Existing rows get sensible defaults.

alter table public.accounts
  add column if not exists "accountType" text not null default 'demo',
  add column if not exists "leverage" double precision not null default 100;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_accounttype_check'
  ) then
    alter table public.accounts
      add constraint accounts_accounttype_check
      check ("accountType" in ('live', 'propfirm', 'demo'));
  end if;
end $$;
