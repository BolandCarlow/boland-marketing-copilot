# Architecture

Boland Marketing Copilot is a Next.js App Router application backed by Supabase. It deliberately separates browser-safe authentication and dashboard reads from server-only administration, credential encryption and data ingestion.

## Application modules

- **Authentication** lives in `app/auth`, `middleware.ts` and `lib/supabase`. `AuthForm` is the single client implementation for passwordless email and Google OAuth. The callback exchanges the code for a session and sends safe, actionable failures back to `/auth`.
- **Lead Intelligence** is the protected `/dashboard` route. It reads the KPI, lead, spend and insight tables through the authenticated Supabase client, so row-level security remains the data boundary.
- **GA4 and intake APIs** use `app/api/v1/sync/[provider]`. Requests require `x-boland-sync-secret`, are limited to 500 records and are queued before normalisation. GA4 records populate `website_metrics`; paid-media and lead sources follow the corresponding normalisers.
- **Integrations Centre** is `/dashboard/settings/integrations`. Server actions save encrypted credentials and schedule metadata; adapters in `lib/integrations` remain placeholders until a live provider is explicitly enabled.

## Folder structure

```
app/                         routes, server components and route handlers
  auth/                      sign-in form and OAuth callback
  dashboard/                 protected lead and integration UI
  api/                       authenticated intake and internal job endpoints
lib/
  supabase/                  browser, server and service-role clients
  data-platform/             provider catalogue, validation, encryption and queue processing
  integrations/              adapter contract and integration orchestration
supabase/migrations/         ordered database schema and seed migrations
docs/                        architecture and development guidance
```

The provider catalogue in `lib/data-platform/providers.ts` is the single source of truth for provider IDs, configuration labels and accepted records. Do not add a second route-specific provider registry.

## Database schema

The foundational reference tables are `brands`, `vehicle_models` and `marketing_sources`. Campaigns are attached to sources and optionally brands. Leads retain source, brand, vehicle and campaign attribution. Website, Google Ads and Meta Ads facts retain raw input JSON for traceability; `marketing_spend` provides a common reporting projection.

`daily_kpi_summary` is a denormalised read model refreshed by the service-role-only `refresh_daily_kpi_summary` function. `marketing_insights` stores curated or future AI-generated recommendations. Integration configuration is user scoped in `integration_settings`; `integration_sync_history` and `integration_error_logs` provide user-scoped audit trails. `marketing_sync_jobs` is the shared asynchronous intake queue.

All application tables have row-level security enabled. Dashboard data is readable by authenticated internal users; integration configuration, history and errors are restricted to their owning user. Service-role credentials are required only in server-only modules and must never be exposed to the browser.

## Integration architecture

1. An upstream system sends a normalised batch to `/api/v1/sync/{provider}` with the shared sync secret.
2. The route validates the provider and batch size, then writes a pending `marketing_sync_jobs` record.
3. The internal processing endpoint claims jobs safely, normalises records and uses idempotent upserts into source-specific facts, leads and spend.
4. The Integrations Centre stores user configuration encrypted with AES-256-GCM. It records tests and sync activity without logging credentials.
5. A provider adapter can later decrypt credentials on the server, call an upstream API, translate results into the established batch format and enqueue them. No live API connector is present today.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe Supabase connection values. `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` and `MARKETING_SYNC_API_SECRET` are server-only secrets. Keep production values in the deployment platform's secret store; never commit `.env.local`.
