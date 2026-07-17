-- Manual and CSV lead import workflow. Source attribution is explicit: unknown values are Unattributed.
insert into public.lead_sources (name, slug, channel, tracks_marketing_spend) values
  ('Other', 'other', 'other', false),
  ('Unattributed', 'unattributed', 'unattributed', false)
on conflict (slug) do update set name = excluded.name, channel = excluded.channel, tracks_marketing_spend = excluded.tracks_marketing_spend, is_active = true;

create table if not exists public.lead_import_history (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  total_rows integer not null check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  merged_rows integer not null default 0 check (merged_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists lead_import_history_created_at_idx on public.lead_import_history (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(customer_email)) where customer_email is not null;
create index if not exists leads_phone_idx on public.leads (customer_phone) where customer_phone is not null;

alter table public.lead_import_history enable row level security;
drop policy if exists "authenticated users can manage lead import history" on public.lead_import_history;
create policy "authenticated users can manage lead import history" on public.lead_import_history for all to authenticated using (true) with check (true);
