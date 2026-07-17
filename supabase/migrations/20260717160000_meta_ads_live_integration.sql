alter table public.meta_ads_metrics
  add column if not exists link_clicks integer not null default 0 check (link_clicks >= 0),
  add column if not exists ctr numeric(10,4) not null default 0 check (ctr >= 0),
  add column if not exists cpc numeric(12,4) not null default 0 check (cpc >= 0),
  add column if not exists cpm numeric(12,4) not null default 0 check (cpm >= 0);

create index if not exists meta_ads_metrics_date_idx on public.meta_ads_metrics (metric_date desc);

comment on column public.integration_settings.encrypted_credentials is
  'AES-256-GCM encrypted server-side credentials. Meta OAuth long-lived access tokens are never stored in plaintext.';
