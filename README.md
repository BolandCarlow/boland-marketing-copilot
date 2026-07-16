# Boland Marketing Copilot

The first foundation for Boland's internal marketing performance workspace.

## Included

- Supabase authentication: Google OAuth and passwordless email sign-in.
- Protected dashboard shell with a practical onboarding view.
- Typed integration definitions and server endpoints for Google Analytics 4, Google Ads and Meta Ads.
- Environment template for Supabase and provider OAuth credentials.

## Run locally

1. Copy `.env.example` to `.env.local` and add your Supabase project URL and anon key.
2. In Supabase Authentication, add `http://localhost:3000/auth/callback` as a redirect URL and enable Email and Google providers as needed.
3. Run `npm install` and `npm run dev`.

## Integration next steps

The dashboard intentionally shows a configuration state until OAuth credentials and account/property selection are implemented. Provider-specific credentials stay server-side; use the routes in `app/api/integrations` as the starting point for OAuth initiation and callback handling.
