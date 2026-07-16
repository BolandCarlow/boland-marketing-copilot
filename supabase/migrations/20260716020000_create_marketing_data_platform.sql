create extension if not exists pgcrypto;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create table if not exists public.marketing_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null unique check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries')),
  category text not null check (category in ('analytics', 'paid-search', 'paid-social', 'marketplace', 'website')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.marketing_sources(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  external_id text,
  name text not null,
  channel text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed')),
  start_date date,
  end_date date,
  budget numeric(12,2),
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campaigns_source_external_id_idx
  on public.campaigns (source_id, external_id) where external_id is not null;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  source_id uuid not null references public.marketing_sources(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  vehicle_model_id uuid references public.vehicle_models(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  occurred_at timestamptz not null,
  customer_name text not null,
  email text,
  phone text,
  salesperson text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'appointment', 'won', 'lost')),
  notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_source_external_id_idx
  on public.leads (source_id, external_id) where external_id is not null;
create index if not exists leads_occurred_at_idx on public.leads (occurred_at desc);
create index if not exists leads_brand_id_idx on public.leads (brand_id);

create table if not exists public.website_metrics (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.marketing_sources(id) on delete restrict,
  metric_date date not null,
  traffic_source text not null default 'all',
  landing_page text not null default '/',
  sessions integer not null default 0 check (sessions >= 0),
  users integer not null default 0 check (users >= 0),
  page_views integer not null default 0 check (page_views >= 0),
  engaged_sessions integer not null default 0 check (engaged_sessions >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  engagement_rate numeric(7,4) not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, metric_date, traffic_source, landing_page)
);

create table if not exists public.google_ads_metrics (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.marketing_sources(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete set null,
  external_campaign_id text not null,
  metric_date date not null,
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  spend numeric(12,2) not null default 0 check (spend >= 0),
  conversions numeric(10,2) not null default 0 check (conversions >= 0),
  conversion_value numeric(12,2) not null default 0 check (conversion_value >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_campaign_id, metric_date)
);

create table if not exists public.meta_ads_metrics (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.marketing_sources(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete set null,
  external_campaign_id text not null,
  metric_date date not null,
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  spend numeric(12,2) not null default 0 check (spend >= 0),
  leads integer not null default 0 check (leads >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_campaign_id, metric_date)
);

create table if not exists public.daily_kpi_summary (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null,
  scope text not null default 'all',
  brand_id uuid references public.brands(id) on delete cascade,
  website_sessions integer not null default 0,
  website_users integer not null default 0,
  website_conversions integer not null default 0,
  total_leads integer not null default 0,
  qualified_leads integer not null default 0,
  ad_spend numeric(12,2) not null default 0,
  ad_clicks integer not null default 0,
  ad_impressions integer not null default 0,
  conversion_value numeric(12,2) not null default 0,
  cost_per_lead numeric(12,2),
  return_on_ad_spend numeric(12,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (summary_date, scope)
);

create index if not exists daily_kpi_summary_date_idx on public.daily_kpi_summary (summary_date desc);

create table if not exists public.marketing_insights (
  id uuid primary key default gen_random_uuid(),
  insight_date date not null default current_date,
  brand_id uuid references public.brands(id) on delete cascade,
  type text not null check (type in ('opportunity', 'warning', 'trend', 'achievement')),
  title text not null,
  summary text not null,
  recommendation text,
  confidence numeric(5,4) check (confidence between 0 and 1),
  supporting_data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries')),
  is_enabled boolean not null default false,
  account_identifier text,
  configuration jsonb not null default '{}'::jsonb,
  encrypted_credentials text,
  last_sync_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'failed', 'running')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.marketing_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('ga4', 'google-ads', 'meta-ads', 'carzone', 'donedeal', 'carsireland', 'website-enquiries')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  payload jsonb not null,
  attempts integer not null default 0,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists marketing_sync_jobs_status_idx
  on public.marketing_sync_jobs (status, queued_at);

alter table public.brands enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.marketing_sources enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.website_metrics enable row level security;
alter table public.google_ads_metrics enable row level security;
alter table public.meta_ads_metrics enable row level security;
alter table public.daily_kpi_summary enable row level security;
alter table public.marketing_insights enable row level security;
alter table public.integration_settings enable row level security;
alter table public.marketing_sync_jobs enable row level security;

create policy "Authenticated users can read brands" on public.brands for select to authenticated using (true);
create policy "Authenticated users can read vehicle models" on public.vehicle_models for select to authenticated using (true);
create policy "Authenticated users can read marketing sources" on public.marketing_sources for select to authenticated using (true);
create policy "Authenticated users can read campaigns" on public.campaigns for select to authenticated using (true);
create policy "Authenticated users can read leads" on public.leads for select to authenticated using (true);
create policy "Authenticated users can read website metrics" on public.website_metrics for select to authenticated using (true);
create policy "Authenticated users can read Google Ads metrics" on public.google_ads_metrics for select to authenticated using (true);
create policy "Authenticated users can read Meta Ads metrics" on public.meta_ads_metrics for select to authenticated using (true);
create policy "Authenticated users can read KPI summaries" on public.daily_kpi_summary for select to authenticated using (true);
create policy "Authenticated users can read insights" on public.marketing_insights for select to authenticated using (true);
create policy "Users can read their integration settings" on public.integration_settings for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their integration settings" on public.integration_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their integration settings" on public.integration_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their integration settings" on public.integration_settings for delete to authenticated using (auth.uid() = user_id);

create or replace function public.claim_marketing_sync_jobs(batch_size integer default 10)
returns setof public.marketing_sync_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.marketing_sync_jobs
  set status = 'processing', started_at = now(), attempts = attempts + 1
  where id in (
    select id from public.marketing_sync_jobs
    where status = 'pending'
    order by queued_at
    limit greatest(1, least(batch_size, 50))
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_marketing_sync_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_marketing_sync_jobs(integer) to service_role;

create or replace function public.refresh_daily_kpi_summary(target_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  website record;
  ads record;
  lead_totals record;
begin
  select coalesce(sum(sessions), 0)::integer as sessions,
         coalesce(sum(users), 0)::integer as users,
         coalesce(sum(conversions), 0)::integer as conversions
    into website
  from public.website_metrics where metric_date = target_date;

  select coalesce(sum(spend), 0) as spend,
         coalesce(sum(clicks), 0)::integer as clicks,
         coalesce(sum(impressions), 0)::integer as impressions,
         coalesce(sum(conversion_value), 0) as conversion_value
    into ads
  from (
    select spend, clicks, impressions, conversion_value from public.google_ads_metrics where metric_date = target_date
    union all
    select spend, clicks, impressions, 0::numeric as conversion_value from public.meta_ads_metrics where metric_date = target_date
  ) paid;

  select count(*)::integer as total,
         count(*) filter (where status in ('qualified', 'appointment', 'won'))::integer as qualified
    into lead_totals
  from public.leads where occurred_at::date = target_date;

  insert into public.daily_kpi_summary (
    summary_date, scope, website_sessions, website_users, website_conversions,
    total_leads, qualified_leads, ad_spend, ad_clicks, ad_impressions,
    conversion_value, cost_per_lead, return_on_ad_spend, updated_at
  ) values (
    target_date, 'all', website.sessions, website.users, website.conversions,
    lead_totals.total, lead_totals.qualified, ads.spend, ads.clicks, ads.impressions,
    ads.conversion_value,
    case when lead_totals.total > 0 then ads.spend / lead_totals.total else null end,
    case when ads.spend > 0 then ads.conversion_value / ads.spend else null end,
    now()
  )
  on conflict (summary_date, scope) do update set
    website_sessions = excluded.website_sessions,
    website_users = excluded.website_users,
    website_conversions = excluded.website_conversions,
    total_leads = excluded.total_leads,
    qualified_leads = excluded.qualified_leads,
    ad_spend = excluded.ad_spend,
    ad_clicks = excluded.ad_clicks,
    ad_impressions = excluded.ad_impressions,
    conversion_value = excluded.conversion_value,
    cost_per_lead = excluded.cost_per_lead,
    return_on_ad_spend = excluded.return_on_ad_spend,
    updated_at = now();
end;
$$;

revoke all on function public.refresh_daily_kpi_summary(date) from public, anon, authenticated;
grant execute on function public.refresh_daily_kpi_summary(date) to service_role;

insert into public.brands (name, slug) values
  ('Škoda', 'skoda'), ('Volvo', 'volvo'), ('Peugeot', 'peugeot'), ('Mazda', 'mazda')
on conflict (slug) do nothing;

insert into public.vehicle_models (brand_id, name, slug)
select b.id, model.name, model.slug
from public.brands b
join (values
  ('skoda', 'Octavia', 'octavia'), ('skoda', 'Kodiaq', 'kodiaq'), ('skoda', 'Enyaq', 'enyaq'),
  ('volvo', 'EX30', 'ex30'), ('volvo', 'XC40', 'xc40'), ('volvo', 'XC60', 'xc60'),
  ('peugeot', '208', '208'), ('peugeot', '3008', '3008'), ('peugeot', '5008', '5008'),
  ('mazda', 'CX-30', 'cx-30'), ('mazda', 'CX-5', 'cx-5'), ('mazda', 'Mazda3', 'mazda3')
) as model(brand_slug, name, slug) on model.brand_slug = b.slug
on conflict (brand_id, slug) do nothing;

insert into public.marketing_sources (name, provider, category) values
  ('Google Analytics 4', 'ga4', 'analytics'),
  ('Google Ads', 'google-ads', 'paid-search'),
  ('Meta Ads', 'meta-ads', 'paid-social'),
  ('Carzone', 'carzone', 'marketplace'),
  ('DoneDeal', 'donedeal', 'marketplace'),
  ('CarsIreland', 'carsireland', 'marketplace'),
  ('Website Enquiries', 'website-enquiries', 'website')
on conflict (provider) do nothing;

insert into public.campaigns (source_id, brand_id, external_id, name, channel, status, start_date, budget)
select s.id, b.id, seed.external_id, seed.name, seed.channel, 'active', current_date - 45, seed.budget
from (values
  ('google-ads', 'skoda', 'seed-ga-skoda', 'Škoda Summer Drive', 'Paid search', 12000::numeric),
  ('google-ads', 'volvo', 'seed-ga-volvo', 'Volvo Electric Range', 'Paid search', 10000::numeric),
  ('meta-ads', 'peugeot', 'seed-meta-peugeot', 'Peugeot 3008 Launch', 'Paid social', 8500::numeric),
  ('meta-ads', 'mazda', 'seed-meta-mazda', 'Mazda Test Drive', 'Paid social', 7000::numeric)
) as seed(provider, brand_slug, external_id, name, channel, budget)
join public.marketing_sources s on s.provider = seed.provider
join public.brands b on b.slug = seed.brand_slug
on conflict (source_id, external_id) where external_id is not null do nothing;

insert into public.website_metrics (
  source_id, metric_date, traffic_source, landing_page, sessions, users,
  page_views, engaged_sessions, conversions, engagement_rate
)
select s.id, day::date, 'all', '/',
  920 + (extract(day from day)::integer * 13) % 280,
  690 + (extract(day from day)::integer * 11) % 210,
  1740 + (extract(day from day)::integer * 29) % 520,
  610 + (extract(day from day)::integer * 9) % 190,
  34 + (extract(day from day)::integer * 3) % 22,
  round((0.62 + ((extract(day from day)::integer % 8) / 100.0))::numeric, 4)
from public.marketing_sources s
cross join generate_series(current_date - 29, current_date, interval '1 day') day
where s.provider = 'ga4'
on conflict (source_id, metric_date, traffic_source, landing_page) do nothing;

insert into public.google_ads_metrics (
  source_id, campaign_id, external_campaign_id, metric_date,
  impressions, clicks, spend, conversions, conversion_value
)
select s.id, c.id, c.external_id, day::date,
  6200 + (extract(day from day)::integer * 101) % 1800,
  230 + (extract(day from day)::integer * 17) % 95,
  215 + (extract(day from day)::integer * 7) % 85,
  9 + (extract(day from day)::integer * 3) % 8,
  4200 + (extract(day from day)::integer * 137) % 2400
from public.marketing_sources s
join public.campaigns c on c.source_id = s.id
cross join generate_series(current_date - 29, current_date, interval '1 day') day
where s.provider = 'google-ads'
on conflict (source_id, external_campaign_id, metric_date) do nothing;

insert into public.meta_ads_metrics (
  source_id, campaign_id, external_campaign_id, metric_date,
  impressions, reach, clicks, spend, leads
)
select s.id, c.id, c.external_id, day::date,
  8900 + (extract(day from day)::integer * 127) % 2400,
  6700 + (extract(day from day)::integer * 109) % 1900,
  180 + (extract(day from day)::integer * 13) % 80,
  165 + (extract(day from day)::integer * 5) % 70,
  7 + (extract(day from day)::integer * 2) % 9
from public.marketing_sources s
join public.campaigns c on c.source_id = s.id
cross join generate_series(current_date - 29, current_date, interval '1 day') day
where s.provider = 'meta-ads'
on conflict (source_id, external_campaign_id, metric_date) do nothing;

insert into public.leads (
  external_id, source_id, brand_id, vehicle_model_id, campaign_id, occurred_at,
  customer_name, email, phone, salesperson, status, notes
)
select seed.external_id, s.id, b.id, vm.id, c.id,
  current_date - seed.days_ago + time '10:30', seed.customer_name,
  seed.email, seed.phone, seed.salesperson, seed.status, seed.notes
from (values
  ('seed-lead-001', 'website-enquiries', 'skoda', 'octavia', 'seed-ga-skoda', 0, 'Aoife Murphy', 'aoife.murphy@example.invalid', '+353 85 000 0101', 'Sarah Byrne', 'new', 'Requested an Octavia test drive.'),
  ('seed-lead-002', 'carzone', 'volvo', 'xc40', null, 1, 'Cian Walsh', 'cian.walsh@example.invalid', '+353 85 000 0102', 'James Nolan', 'contacted', 'Trade-in valuation requested.'),
  ('seed-lead-003', 'donedeal', 'peugeot', '3008', 'seed-meta-peugeot', 2, 'Niamh Kelly', 'niamh.kelly@example.invalid', '+353 85 000 0103', 'Laura Ryan', 'qualified', 'Interested in finance options.'),
  ('seed-lead-004', 'carsireland', 'mazda', 'cx-5', 'seed-meta-mazda', 3, 'Darragh Doyle', 'darragh.doyle@example.invalid', '+353 85 000 0104', 'Sarah Byrne', 'appointment', 'Showroom appointment arranged.'),
  ('seed-lead-005', 'website-enquiries', 'volvo', 'ex30', 'seed-ga-volvo', 4, 'Saoirse Brennan', 'saoirse.brennan@example.invalid', '+353 85 000 0105', 'James Nolan', 'won', 'Deposit received.'),
  ('seed-lead-006', 'carzone', 'skoda', 'kodiaq', null, 6, 'Eoin Power', 'eoin.power@example.invalid', '+353 85 000 0106', 'Laura Ryan', 'contacted', 'Seven-seat vehicle enquiry.'),
  ('seed-lead-007', 'website-enquiries', 'mazda', 'cx-30', 'seed-meta-mazda', 8, 'Orla Dunne', 'orla.dunne@example.invalid', '+353 85 000 0107', 'Sarah Byrne', 'qualified', 'Asked about immediate availability.'),
  ('seed-lead-008', 'donedeal', 'peugeot', '208', null, 12, 'Conor Hayes', 'conor.hayes@example.invalid', '+353 85 000 0108', 'James Nolan', 'lost', 'Purchased elsewhere.')
) as seed(external_id, provider, brand_slug, model_slug, campaign_external_id, days_ago, customer_name, email, phone, salesperson, status, notes)
join public.marketing_sources s on s.provider = seed.provider
join public.brands b on b.slug = seed.brand_slug
join public.vehicle_models vm on vm.brand_id = b.id and vm.slug = seed.model_slug
left join public.campaigns c on c.external_id = seed.campaign_external_id
on conflict (source_id, external_id) where external_id is not null do nothing;

insert into public.marketing_insights (insight_date, type, title, summary, recommendation, confidence, supporting_data)
select current_date, seed.type, seed.title, seed.summary, seed.recommendation, seed.confidence, seed.supporting_data::jsonb
from (values
  ('opportunity', 'Škoda search demand is converting', 'The Škoda search campaign is generating the strongest seeded conversion value.', 'Keep budget available for high-intent Octavia and Kodiaq searches.', 0.91::numeric, '{"metric":"conversion_value","direction":"up"}'),
  ('trend', 'Electric vehicle interest is growing', 'EX30 and Enyaq enquiries are represented across website and marketplace sources.', 'Create a shared EV landing-page test for the next campaign cycle.', 0.82::numeric, '{"segment":"electric-vehicles"}'),
  ('warning', 'Marketplace follow-up needs attention', 'Several marketplace leads remain in early pipeline stages.', 'Review new marketplace enquiries each morning and assign an owner.', 0.88::numeric, '{"sources":["carzone","donedeal","carsireland"]}')
) as seed(type, title, summary, recommendation, confidence, supporting_data)
where not exists (select 1 from public.marketing_insights where title = seed.title and insight_date = current_date);

select public.refresh_daily_kpi_summary(day::date)
from generate_series(current_date - 29, current_date, interval '1 day') day;
