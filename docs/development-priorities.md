# Recommended development priorities

1. **Apply and validate migrations in a non-production Supabase project.** Add generated Supabase database types and an automated migration check before expanding the schema.
2. **Build live providers one at a time.** Start with GA4, implement its adapter server-side, then add secret rotation, provider-specific retry behaviour and observable job metrics. Keep the existing queue contract unchanged.
3. **Harden access and operations.** Decide whether dashboard data should be organisation-scoped rather than globally readable by authenticated users, add rate limiting to public intake endpoints and configure scheduled calls through a trusted scheduler.
4. **Scale reporting deliberately.** Replace dashboard-wide client aggregation with database views or RPCs once lead and spend volumes outgrow the current bounded queries. Add targeted indexes only after examining production query plans.
5. **Add automated coverage.** Prioritise normaliser validation, credential encryption, auth callback handling, queue idempotency and RLS policy tests. Keep `typecheck`, `lint` and `build` required in CI.
