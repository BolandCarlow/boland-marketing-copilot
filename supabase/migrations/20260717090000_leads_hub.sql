-- Leads Hub: extend the existing Lead Intelligence foundation without changing revenue or profit data.
create extension if not exists pgcrypto;

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  channel text not null default 'owned',
  tracks_marketing_spend boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.salespeople (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists lead_source_id uuid references public.lead_sources(id),
  add column if not exists assigned_salesperson_id uuid references public.salespeople(id),
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists registration_or_stock_number text,
  add column if not exists county text,
  add column if not exists campaign_name text,
  add column if not exists is_duplicate boolean not null default false,
  add column if not exists duplicate_of_lead_id uuid references public.leads(id),
  add column if not exists is_demo boolean not null default false,
  add column if not exists import_provider text,
  add column if not exists import_external_id text,
  add column if not exists raw_payload jsonb;

-- Preserve the existing GA4 and marketing-source foundation while allowing
-- Leads Hub manual and offline sources that do not have a provider connector.
alter table public.leads alter column source_id drop not null;
alter table public.leads drop constraint if exists leads_status_check;
update public.leads
set status = case status
  when 'new' then 'New'
  when 'contacted' then 'Contacted'
  when 'qualified' then 'Appointment Booked'
  when 'appointment' then 'Appointment Booked'
  when 'won' then 'Closed'
  when 'lost' then 'Closed'
  else status
end;
alter table public.leads add constraint leads_status_check
  check (status in ('New', 'Contacted', 'Appointment Booked', 'Follow-up', 'Closed', 'Duplicate'));
update public.leads
set customer_email = coalesce(customer_email, email),
    customer_phone = coalesce(customer_phone, phone);

create unique index if not exists leads_provider_external_id_key
  on public.leads (import_provider, import_external_id)
  where import_provider is not null and import_external_id is not null;
create index if not exists leads_occurred_at_idx on public.leads (occurred_at desc);
create index if not exists leads_source_occurred_at_idx on public.leads (lead_source_id, occurred_at desc);
create index if not exists leads_brand_occurred_at_idx on public.leads (brand_id, occurred_at desc);
create index if not exists leads_salesperson_occurred_at_idx on public.leads (assigned_salesperson_id, occurred_at desc);
create index if not exists leads_status_occurred_at_idx on public.leads (status, occurred_at desc);

create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  previous_status text,
  next_status text not null check (next_status in ('New', 'Contacted', 'Appointment Booked', 'Follow-up', 'Closed', 'Duplicate')),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists lead_status_history_lead_changed_idx on public.lead_status_history (lead_id, changed_at desc);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_created_idx on public.lead_notes (lead_id, created_at desc);

create or replace function public.record_lead_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_status_history (lead_id, previous_status, next_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.lead_status_history (lead_id, previous_status, next_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists leads_record_status_change on public.leads;
create trigger leads_record_status_change after insert or update of status on public.leads
for each row execute function public.record_lead_status_change();

alter table public.leads enable row level security;
alter table public.lead_sources enable row level security;
alter table public.salespeople enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.lead_notes enable row level security;

drop policy if exists "authenticated users can manage leads" on public.leads;
create policy "authenticated users can manage leads" on public.leads for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users can manage lead sources" on public.lead_sources;
create policy "authenticated users can manage lead sources" on public.lead_sources for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users can manage salespeople" on public.salespeople;
create policy "authenticated users can manage salespeople" on public.salespeople for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users can read lead history" on public.lead_status_history;
create policy "authenticated users can read lead history" on public.lead_status_history for select to authenticated using (true);
drop policy if exists "authenticated users can add lead history" on public.lead_status_history;
create policy "authenticated users can add lead history" on public.lead_status_history for insert to authenticated with check (true);
drop policy if exists "authenticated users can manage lead notes" on public.lead_notes;
create policy "authenticated users can manage lead notes" on public.lead_notes for all to authenticated using (true) with check (true);

insert into public.lead_sources (name, slug, channel, tracks_marketing_spend) values
  ('Website', 'website', 'owned', false), ('Carzone', 'carzone', 'marketplace', false),
  ('DoneDeal', 'donedeal', 'marketplace', false), ('CarsIreland', 'carsireland', 'marketplace', false),
  ('Meta Lead Ads', 'meta-lead-ads', 'paid', true), ('Google Ads', 'google-ads', 'paid', true),
  ('Gmail Lead Inbox', 'gmail-lead-inbox', 'inbox', false), ('Phone', 'phone', 'offline', false),
  ('WhatsApp', 'whatsapp', 'messaging', false), ('Walk-in', 'walk-in', 'offline', false), ('Manual entry', 'manual-entry', 'manual', false)
on conflict (slug) do update set name = excluded.name, channel = excluded.channel, tracks_marketing_spend = excluded.tracks_marketing_spend;

-- Map existing connected-source leads into the Hub taxonomy without changing
-- marketing_sources, GA4, or Integrations Centre provider identities.
update public.leads as lead
set lead_source_id = hub_source.id
from public.marketing_sources as marketing_source
join public.lead_sources as hub_source on hub_source.slug = case marketing_source.provider
  when 'website-enquiries' then 'website'
  when 'meta-ads' then 'meta-lead-ads'
  else marketing_source.provider
end
where lead.source_id = marketing_source.id and lead.lead_source_id is null;

insert into public.salespeople (name)
select distinct lead.salesperson
from public.leads as lead
where lead.salesperson is not null
  and not exists (select 1 from public.salespeople as salesperson where salesperson.name = lead.salesperson);

update public.leads as lead
set assigned_salesperson_id = salesperson.id
from public.salespeople as salesperson
where lead.assigned_salesperson_id is null and lead.salesperson = salesperson.name;
