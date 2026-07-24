-- Meta Ads OAuth foundation. Tokens and callback codes are encrypted by the application
-- before storage; this migration never stores plaintext credentials.
create extension if not exists pgcrypto;

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  connection_status text not null default 'not_connected'
    check (connection_status in ('not_connected', 'authorization_pending', 'authorization_pending_exchange', 'connected', 'needs_reauthorization', 'error')),
  encrypted_authorization_code text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  oauth_state_hash text,
  oauth_state_expires_at timestamptz,
  authorization_received_at timestamptz,
  scheduled_sync_enabled boolean not null default false,
  last_scheduled_at timestamptz,
  last_refresh_attempt_at timestamptz,
  last_refresh_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_snapshots (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.meta_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'skipped')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, snapshot_date)
);

create index if not exists meta_connections_schedule_idx on public.meta_connections (scheduled_sync_enabled) where scheduled_sync_enabled;
create index if not exists meta_snapshots_connection_date_idx on public.meta_snapshots (connection_id, snapshot_date desc);
create index if not exists meta_snapshots_user_created_idx on public.meta_snapshots (user_id, created_at desc);

create or replace function public.set_meta_connection_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meta_connections_set_updated_at on public.meta_connections;
create trigger meta_connections_set_updated_at before update on public.meta_connections
for each row execute function public.set_meta_connection_updated_at();

drop trigger if exists meta_snapshots_set_updated_at on public.meta_snapshots;
create trigger meta_snapshots_set_updated_at before update on public.meta_snapshots
for each row execute function public.set_meta_connection_updated_at();

alter table public.meta_connections enable row level security;
alter table public.meta_snapshots enable row level security;

revoke all on public.meta_connections, public.meta_snapshots from anon;
grant select, insert, update, delete on public.meta_connections to authenticated;
grant select on public.meta_snapshots to authenticated;

drop policy if exists "Users can read their own Meta connections" on public.meta_connections;
create policy "Users can read their own Meta connections" on public.meta_connections for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can add their own Meta connections" on public.meta_connections;
create policy "Users can add their own Meta connections" on public.meta_connections for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own Meta connections" on public.meta_connections;
create policy "Users can update their own Meta connections" on public.meta_connections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can remove their own Meta connections" on public.meta_connections;
create policy "Users can remove their own Meta connections" on public.meta_connections for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own Meta snapshots" on public.meta_snapshots;
create policy "Users can read their own Meta snapshots" on public.meta_snapshots for select to authenticated using ((select auth.uid()) = user_id);
