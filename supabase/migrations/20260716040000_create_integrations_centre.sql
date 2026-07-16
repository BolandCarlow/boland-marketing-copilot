alter table public.marketing_sources drop constraint if exists marketing_sources_provider_check;
alter table public.marketing_sources add constraint marketing_sources_provider_check
  check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries', 'gmail-lead-inbox'));

alter table public.marketing_sources drop constraint if exists marketing_sources_category_check;
alter table public.marketing_sources add constraint marketing_sources_category_check
  check (category in ('analytics', 'paid-search', 'paid-social', 'marketplace', 'website', 'email'));

alter table public.integration_settings drop constraint if exists integration_settings_provider_check;
alter table public.integration_settings add constraint integration_settings_provider_check
  check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries', 'gmail-lead-inbox'));

alter table public.marketing_sync_jobs drop constraint if exists marketing_sync_jobs_provider_check;
alter table public.marketing_sync_jobs add constraint marketing_sync_jobs_provider_check
  check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries', 'gmail-lead-inbox'));

alter table public.integration_settings
  add column if not exists connection_status text not null default 'not_connected'
    check (connection_status in ('not_connected', 'configured', 'connected', 'error')),
  add column if not exists authentication_type text not null default 'api_key'
    check (authentication_type in ('oauth', 'api_key', 'service_account', 'webhook')),
  add column if not exists scheduled_sync_enabled boolean not null default false,
  add column if not exists sync_frequency text not null default 'daily'
    check (sync_frequency in ('hourly', 'every_6_hours', 'daily', 'weekly')),
  add column if not exists next_scheduled_sync_at timestamptz,
  add column if not exists last_tested_at timestamptz,
  add column if not exists test_status text
    check (test_status in ('configuration_valid', 'missing_configuration', 'connected', 'failed'));

create table if not exists public.integration_sync_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_setting_id uuid references public.integration_settings(id) on delete set null,
  sync_job_id uuid references public.marketing_sync_jobs(id) on delete set null,
  provider text not null check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries', 'gmail-lead-inbox')),
  trigger_type text not null check (trigger_type in ('manual', 'scheduled', 'webhook', 'connection_test')),
  status text not null check (status in ('queued', 'running', 'success', 'failed', 'skipped')),
  records_received integer not null default 0 check (records_received >= 0),
  records_processed integer not null default 0 check (records_processed >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integration_sync_history_user_created_idx
  on public.integration_sync_history (user_id, created_at desc);
create index if not exists integration_sync_history_provider_created_idx
  on public.integration_sync_history (provider, created_at desc);

create table if not exists public.integration_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_setting_id uuid references public.integration_settings(id) on delete set null,
  sync_history_id uuid references public.integration_sync_history(id) on delete set null,
  provider text not null check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries', 'gmail-lead-inbox')),
  severity text not null default 'error' check (severity in ('warning', 'error', 'critical')),
  error_code text,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists integration_error_logs_user_created_idx
  on public.integration_error_logs (user_id, created_at desc);
create index if not exists integration_error_logs_unresolved_idx
  on public.integration_error_logs (provider, created_at desc) where resolved_at is null;

alter table public.integration_sync_history enable row level security;
alter table public.integration_error_logs enable row level security;

create policy "Users can read their integration sync history"
  on public.integration_sync_history for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create their integration sync history"
  on public.integration_sync_history for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read their integration errors"
  on public.integration_error_logs for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can resolve their integration errors"
  on public.integration_error_logs for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.marketing_sources (name, provider, category)
values ('Gmail Lead Inbox', 'gmail-lead-inbox', 'email')
on conflict (provider) do nothing;

comment on table public.integration_sync_history is
  'Immutable user-visible audit trail for manual, scheduled, webhook and connection-test integration runs.';
comment on table public.integration_error_logs is
  'Structured provider errors with safe context only; credentials and raw secrets must never be logged.';
