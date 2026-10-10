-- Trade asset-class category: forex / indices / futures / stocks.
-- Mirrors Trade.category in the frontend (frontend/src/types/trade.ts).
-- Existing rows stay NULL ("uncategorized") until the app updates them.

alter table public.trades add column if not exists category text;

create index if not exists trades_category_idx on public.trades (category);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trades_category_check'
  ) then
    alter table public.trades
      add constraint trades_category_check
      check (category is null or category in ('forex', 'indices', 'futures', 'stocks'));
  end if;
end $$;
