# World Concern Radar

Evidence-ledger backend for detecting and decomposing human wellbeing concerns for deeper research. This stage does not assess products, markets, willingness to pay, or business opportunity.

## Deployment
- Supabase project ref: xketsvvssnlhzyenmnsw
- Edge Function: world-concern-radar
- URL: https://xketsvvssnlhzyenmnsw.supabase.co/functions/v1/world-concern-radar
- JWT verification enabled.

## Routes
Authenticated routes: GET /health, GET/POST /runs, GET/PATCH /runs/:id, POST /runs/:id/claims, POST /runs/:id/sources, POST /runs/:id/signals, GET /runs/:id/ledger.

## Evidence integrity
Keep EXPERIENCED separate from WORRIED; modelled exposure is neither direct harm nor worry. Missing data stays UNKNOWN. Record geography, population, period, denominator, limitations, alternative explanations, source dependencies, counterevidence and falsification conditions. Do not invent figures or sources. This API stores evidence records; it does not crawl or independently verify sources.

## Database and security
Five tables use Row Level Security. The function validates the caller's Supabase access token and scopes records to that user. Never commit service-role keys or other secrets.

## Testing status
Deployment and database migrations are confirmed. Authenticated end-to-end testing with a real user session remains outstanding.
