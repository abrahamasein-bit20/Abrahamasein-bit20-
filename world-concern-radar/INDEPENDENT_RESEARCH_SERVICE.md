# iValth Independent Research Service

A standalone, request-triggered research API deployed as a Supabase Edge Function. It does not depend on a ChatGPT plugin conversation. It uses the OpenAI Responses API with web search to create a bounded first-pass World Concern Radar result and stores the run and JSON output in Supabase.

## Status and boundaries

- Deployed function: `ivealth-research-service`
- Project: Supabase project `xketsvvssnlhzyenmnsw`
- Database table: `public.research_jobs`
- Provider: OpenAI Responses API with `web_search`
- Current operation is request-triggered, not a scheduled continuous crawler.
- Authentication is required: send a Supabase user access token as a Bearer token. Service-role credentials remain server-side.
- The result is a first-pass research artifact, not a guarantee of complete global coverage or independent source verification. Human approval gates remain mandatory. The deployed research function requires web search on each request and records an API search trace (sources and citation annotations). A URL observed in that trace is not proof that the source supports the linked claim; unobserved or invalid source-ledger URLs are flagged for manual review.
- The function returns a clear configuration error until `OPENAI_API_KEY` is set as a Supabase Edge Function secret.

## Configure provider

Set `OPENAI_API_KEY` as a Supabase Edge Function secret for the selected project. Never put it in Vercel `NEXT_PUBLIC_*` variables or browser code. Optional secret `OPENAI_RESEARCH_MODEL` overrides the default `gpt-6.1-sol`; optional `OPENAI_REASONING_EFFORT` defaults to `medium` for GPT-5/GPT-6 model IDs. The key must be copied from the OpenAI Platform key setup flow and saved separately in Supabase Edge Function Secrets; creating the key does not configure Supabase automatically.

## Optional second-model critique

A separate function is available at:

`https://xketsvvssnlhzyenmnsw.supabase.co/functions/v1/ivealth-model-audit`

It accepts a saved `research_jobs.id`, retrieves the job only for the authenticated owner, sends the research artifact to a separately configured external critique model, and stores the critique at `result.model_audit`. It does not browse or independently verify source URLs. Findings are unverified review flags and require a human reviewer.

Configure these Edge Function secrets in the Supabase Dashboard:
- `MODEL_AUDIT_API_KEY`: the selected OpenAI-compatible provider API key.
- `MODEL_AUDIT_MODEL`: an exact model ID.
- `MODEL_AUDIT_BASE_URL`: optional; defaults to `https://openrouter.ai/api/v1/chat/completions`.

For controlled prototyping with synthetic/public non-confidential data, the current first benchmark target is `nvidia/nemotron-3-ultra-550b-a55b:free`. OpenRouter currently lists it as free, but its free endpoint discloses that usage is logged and may be used for model/service improvement; its notice says not to upload confidential information or personal data. Read current terms before sending any non-public data. Free-tier access and availability may change. Model ID and terms reference: https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b%3Afree

Every audit POST requires per-request JSON consent, `confirm_external_processing: true`; this acknowledges the external transfer but does not make a provider appropriate for confidential data.

Example body:
```json
{
  "job_id": "UUID from a completed research job",
  "confirm_external_processing": true
}
```

The authenticated workspace UI route is `/research-engine`. It has been added on branch `research/open-model-stack`; it is not yet included in the current production frontend deployment.

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
