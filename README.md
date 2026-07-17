# Boland Marketing Copilot

The Lead Intelligence foundation gives Boland a single Supabase data model for dealership enquiries, lead sources, campaigns, brands, vehicle models, marketing spend, daily KPIs and future AI insights.

This version is deliberately offline: it stores integration configuration and accepts normalized input batches, but it does not call Google, Meta or marketplace APIs.

## Included

- Supabase authentication and a protected, responsive dashboard.
- Unified schema for brands, vehicle models, sources, campaigns, leads, website metrics, Google Ads metrics, Meta Ads metrics, daily KPI summaries and insights.
- A platform-neutral marketing spend table for blended spend and cost-per-lead reporting.
- Responsive lead dashboard with source, brand, model and platform breakdowns plus 7-day and 30-day trends.
- Settings → Integrations centre for Google Analytics 4, Google Ads, Meta Ads, Carzone, DoneDeal, CarsIreland, Website Forms and Gmail Lead Inbox.
- Reusable provider adapter contract with encrypted OAuth/API-key configuration, offline connection tests, manual sync controls and automatic schedule metadata.
- User-scoped sync history and structured error logs that never store credentials.
- Row-level security for signed-in dashboard users and per-user integration settings.
- AES-256-GCM encryption for provider credentials before they are written to Supabase.
- Provider-neutral sync queue with validation, normalization, idempotent upserts and KPI refreshes.
- Intake contracts for GA4, Google Ads, Meta Ads, Carzone, DoneDeal, CarsIreland and website enquiries.
- Thirty days of fictional seed metrics, campaigns, leads and insights.

## Local setup

1. Copy `.env.example` to `.env.local` and add the Supabase project URL, anon key and service-role key.
2. Generate the integration encryption key and sync API secret using the commands shown in `.env.example`.
3. Apply the migrations in `supabase/migrations` in filename order with the Supabase CLI or SQL editor. The second migration adds lead-intelligence spend facts and a month of sample dealership enquiries.
4. In Supabase Authentication, add `https://boland-marketing-copilot.vercel.app/auth/callback` as a redirect URL and enable Email or Google sign-in. This is the single callback for both Google OAuth and email magic links.
5. Run `npm install` and `npm run dev`.

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` or `MARKETING_SYNC_API_SECRET` to the browser. Only variables prefixed with `NEXT_PUBLIC_` are browser-safe.

## Sync API foundation

Queue a batch with `POST /api/v1/sync/{provider}`. Send the shared secret in `x-boland-sync-secret` and a JSON body containing a `records` array. Supported provider paths are:

- `ga4`
- `google-ads`
- `meta-ads`
- `carzone`
- `donedeal`
- `carsireland`
- `website-enquiries`

The endpoint returns `202 Accepted` and a job ID. It never calls the upstream provider. A future scheduled worker can invoke `POST /api/internal/sync/process` with the same secret to claim and process queued jobs safely.

Automatic integration schedules use `POST /api/internal/integrations/scheduled`, protected by the same `x-boland-sync-secret` header. The endpoint advances due schedules through the registered provider adapter. All adapters in this foundation are placeholders, so scheduled and manual runs are recorded as `skipped` without making an outbound request.

### GA4 record

```json
{
  "records": [{
    "date": "2026-07-16",
    "trafficSource": "google / organic",
    "landingPage": "/skoda/octavia",
    "sessions": 320,
    "users": 248,
    "pageViews": 610,
    "engagedSessions": 214,
    "conversions": 18,
    "engagementRate": 0.6688
  }]
}
```

### Google Ads or Meta Ads record

```json
{
  "records": [{
    "date": "2026-07-16",
    "campaignId": "provider-campaign-123",
    "campaignName": "Volvo Electric Range",
    "brand": "Volvo",
    "impressions": 12500,
    "reach": 9100,
    "clicks": 380,
    "spend": 420.5,
    "conversions": 21,
    "conversionValue": 8900,
    "leads": 17
  }]
}
```

Provider-specific fields that do not apply are safely ignored. Google Ads persists conversions and conversion value; Meta Ads persists reach and leads.

### Marketplace or website lead record

```json
{
  "records": [{
    "externalId": "enquiry-123",
    "occurredAt": "2026-07-16T09:30:00Z",
    "brand": "Škoda",
    "vehicle": "Kodiaq",
    "campaignId": "optional-provider-campaign-id",
    "customerName": "Example Customer",
    "email": "customer@example.invalid",
    "phone": "+353 85 000 0000",
    "salesperson": "Sales Team",
    "status": "new",
    "notes": "Requested a test drive."
  }]
}
```

Lead statuses are `new`, `contacted`, `qualified`, `appointment`, `won` and `lost`. Each source/external-ID pair is idempotent, so resending a record updates it rather than creating a duplicate.

## Enabling live connectors later

Live connector workers can be added without changing the database or dashboard contracts. Implement the `IntegrationAdapter` contract in `lib/integrations/adapter-registry.ts`, register the provider adapter on the server, retrieve and decrypt credentials inside that adapter, translate upstream records into the documented batch format, and enqueue them. Decryption and provider SDK calls must remain in server-only code.
