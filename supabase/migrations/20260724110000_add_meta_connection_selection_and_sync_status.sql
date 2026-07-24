-- Complete the Meta OAuth connection record with provider-discovered account metadata.
alter table public.meta_connections
  add column if not exists business_manager_id text,
  add column if not exists business_manager_name text,
  add column if not exists ad_account_id text,
  add column if not exists ad_account_name text,
  add column if not exists sync_frequency text not null default 'daily' check (sync_frequency in ('hourly', 'every_6_hours', 'daily', 'weekly')),
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_sync_status text,
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_test_status text;

create index if not exists meta_connections_user_account_idx on public.meta_connections (user_id, ad_account_id);
