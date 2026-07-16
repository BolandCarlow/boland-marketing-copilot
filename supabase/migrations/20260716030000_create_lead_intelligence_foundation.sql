-- Lead sources are stored in marketing_sources so one provider identity is shared
-- by enquiries, campaigns, metrics and spend. Marketing insights are the AI insight
-- foundation; no model or external provider is invoked by this migration.

create table if not exists public.marketing_spend (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.marketing_sources(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  external_campaign_id text not null,
  spend_date date not null,
  platform text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  attributed_leads integer not null default 0 check (attributed_leads >= 0),
  currency text not null default 'EUR',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_campaign_id, spend_date)
);

create index if not exists marketing_spend_date_idx on public.marketing_spend (spend_date desc);
create index if not exists marketing_spend_platform_idx on public.marketing_spend (platform, spend_date desc);

alter table public.marketing_spend enable row level security;
create policy "Authenticated users can read marketing spend"
  on public.marketing_spend for select to authenticated using (true);

insert into public.marketing_spend (
  source_id, campaign_id, brand_id, external_campaign_id, spend_date, platform,
  amount, impressions, clicks, attributed_leads, raw_payload
)
select metrics.source_id, metrics.campaign_id, campaigns.brand_id, metrics.external_campaign_id,
  metrics.metric_date, 'Google Ads', metrics.spend, metrics.impressions,
  metrics.clicks, round(metrics.conversions)::integer,
  jsonb_build_object('seed', true, 'origin', 'google_ads_metrics')
from public.google_ads_metrics metrics
left join public.campaigns campaigns on campaigns.id = metrics.campaign_id
on conflict (source_id, external_campaign_id, spend_date) do nothing;

insert into public.marketing_spend (
  source_id, campaign_id, brand_id, external_campaign_id, spend_date, platform,
  amount, impressions, clicks, attributed_leads, raw_payload
)
select metrics.source_id, metrics.campaign_id, campaigns.brand_id, metrics.external_campaign_id,
  metrics.metric_date, 'Meta Ads', metrics.spend, metrics.impressions,
  metrics.clicks, metrics.leads,
  jsonb_build_object('seed', true, 'origin', 'meta_ads_metrics')
from public.meta_ads_metrics metrics
left join public.campaigns campaigns on campaigns.id = metrics.campaign_id
on conflict (source_id, external_campaign_id, spend_date) do nothing;

with generated_leads as (
  select
    day_offset,
    lead_number,
    (array['website-enquiries', 'carzone', 'donedeal', 'carsireland'])[
      ((day_offset + lead_number) % 4) + 1
    ] as provider,
    (array['skoda', 'volvo', 'peugeot', 'mazda'])[
      ((day_offset * 2 + lead_number) % 4) + 1
    ] as brand_slug,
    (array['Aoife Murphy', 'Cian Walsh', 'Niamh Kelly', 'Darragh Doyle', 'Saoirse Brennan', 'Eoin Power', 'Orla Dunne', 'Conor Hayes'])[
      ((day_offset + lead_number * 2) % 8) + 1
    ] as customer_name,
    (array['Sarah Byrne', 'James Nolan', 'Laura Ryan', 'Michael Flynn'])[
      ((day_offset + lead_number) % 4) + 1
    ] as salesperson,
    (array['new', 'contacted', 'qualified', 'appointment', 'won', 'contacted'])[
      ((day_offset + lead_number) % 6) + 1
    ] as lead_status
  from generate_series(0, 29) day_offset
  cross join generate_series(1, 2) lead_number
), resolved_leads as (
  select generated_leads.*,
    case generated_leads.brand_slug
      when 'skoda' then (array['octavia', 'kodiaq', 'enyaq'])[((day_offset + lead_number) % 3) + 1]
      when 'volvo' then (array['ex30', 'xc40', 'xc60'])[((day_offset + lead_number) % 3) + 1]
      when 'peugeot' then (array['208', '3008', '5008'])[((day_offset + lead_number) % 3) + 1]
      else (array['cx-30', 'cx-5', 'mazda3'])[((day_offset + lead_number) % 3) + 1]
    end as model_slug
  from generated_leads
)
insert into public.leads (
  external_id, source_id, brand_id, vehicle_model_id, occurred_at,
  customer_name, email, phone, salesperson, status, notes, raw_payload
)
select
  'lead-intel-seed-' || resolved.day_offset || '-' || resolved.lead_number,
  sources.id,
  brands.id,
  models.id,
  (current_date - resolved.day_offset) + make_time(9 + resolved.lead_number * 3, 15, 0),
  resolved.customer_name,
  lower(replace(resolved.customer_name, ' ', '.')) || '+' || resolved.day_offset || resolved.lead_number || '@example.invalid',
  '+353 85 100 ' || lpad((resolved.day_offset * 10 + resolved.lead_number)::text, 4, '0'),
  resolved.salesperson,
  resolved.lead_status,
  case resolved.provider
    when 'website-enquiries' then 'Requested a test drive through the dealership website.'
    when 'carzone' then 'Vehicle availability enquiry from Carzone.'
    when 'donedeal' then 'Requested finance information through DoneDeal.'
    else 'Trade-in and appointment enquiry from CarsIreland.'
  end,
  jsonb_build_object('seed', true, 'lead_intelligence_sample', true)
from resolved_leads resolved
join public.marketing_sources sources on sources.provider = resolved.provider
join public.brands brands on brands.slug = resolved.brand_slug
join public.vehicle_models models on models.brand_id = brands.id and models.slug = resolved.model_slug
on conflict (source_id, external_id) where external_id is not null do nothing;

select public.refresh_daily_kpi_summary(day::date)
from generate_series(current_date - 29, current_date, interval '1 day') day;

insert into public.marketing_insights (
  insight_date, type, title, summary, recommendation, confidence, supporting_data
)
select current_date, seed.type, seed.title, seed.summary, seed.recommendation,
  seed.confidence, seed.supporting_data::jsonb
from (values
  ('opportunity', 'Website enquiries are the strongest owned channel', 'First-party website forms provide a dependable daily flow of test-drive enquiries.', 'Prioritise fast follow-up and add vehicle-specific form routing.', 0.92::numeric, '{"source":"website-enquiries","sample":true}'),
  ('trend', 'SUV interest leads the model mix', 'Kodiaq, XC40, 3008 and CX-5 enquiries make SUVs prominent in the sample pipeline.', 'Compare SUV cost per lead by brand when live campaign attribution is enabled.', 0.84::numeric, '{"segment":"suv","sample":true}'),
  ('warning', 'Marketplace leads need consistent ownership', 'Marketplace enquiries are distributed across several salespeople and early pipeline stages.', 'Set a response-time target before marketplace connectors go live.', 0.89::numeric, '{"channel":"marketplace","sample":true}')
) as seed(type, title, summary, recommendation, confidence, supporting_data)
where not exists (
  select 1 from public.marketing_insights
  where title = seed.title and insight_date = current_date
);
