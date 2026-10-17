# iValth Independent Research Service

A standalone, request-triggered research API deployed as a Supabase Edge Function. It does not depend on a ChatGPT plugin conversation. It uses the OpenAI Responses API with web search to create a bounded first-pass World Concern Radar result and stores the run and JSON output in Supabase.

## Status and boundaries

- Deployed function: `ivealth-research-service`
- Project: Supabase project `xketsvvssnlhzyenmnsw`
- Database table: `public.research_jobs`
- Provider: OpenAI Responses API with `web_search`
- Current operation is request-triggered, not a scheduled continuous crawler.
- Authentication is required: send a Supabase user access token as a Bearer token. Service-role credentials remain server-side.
- The result is a first-pass research artifact, not a guarantee of complete global coverage or independent source verification. Human approval gates remain mandatory.
- The function returns a clear configuration error until `OPENAI_API_KEY` is set as a Supabase Edge Function secret.

## Configure provider

Set `OPENAI_API_KEY` as a Supabase Edge Function secret for the selected project. Never put it in Vercel `NEXT_PUBLIC_*` variables or browser code. Optional secret `OPENAI_RESEARCH_MODEL` overrides the default `gpt-4.1`.

## API

Base URL:
`https://xketsvvssnlhzyenmnsw.supabase.co/functions/v1/ivealth-research-service`

All endpoints require `Authorization: Bearer <Supabase user access token>`.

- `GET /health` — authenticated service/configuration status.
- `GET /jobs` — list the current user's latest 50 research jobs.
- `POST /jobs` — run a bounded first-pass research scan and persist the result.
- `GET /jobs/:id` — retrieve a saved job/result owned by the current user.

Example POST body:
```json
{
  "title": "Youth social connection",
  "research_question": "What evidence-backed wellbeing concerns among young adults are emerging or worsening, and what is still uncertain?",
  "geography": "Global",
  "population": "Young adults ages 18-29",
  "time_window": "2020-2026"
}
```

## Output shape

The saved JSON contains `research_brief`, `candidates`, `source_ledger`, `claim_ledger`, `review_gate`, and a status. Missing information should be `UNKNOWN`; candidate selection is always a human decision.

## Deployment and schema

- Edge Function source: `supabase/functions/ivealth-research-service/index.ts`
- Runtime config: `supabase/functions/ivealth-research-service/deno.json`
- Migration: `supabase/migrations/20261017031500_ivealth_research_jobs.sql`

The migration has been applied directly to the selected Supabase project. Run the migration in other environments before deploying the function there.
