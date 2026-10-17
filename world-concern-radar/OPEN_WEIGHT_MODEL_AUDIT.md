# Open-weight model selection for iValth

## Decision

Use a free hosted open-weight model as an optional second-pass structural auditor, not as the source of record, an independent human rater, or an automatic evaluator/selector. The existing OpenAI Responses API remains the research generator until any alternative is benchmarked against a blind task set and approved by a human reviewer.

Initial reviewer: `nvidia/nemotron-3-ultra-550b-a55b:free`.
Alternative to A/B test: `openai/gpt-oss-20b:free`.

OpenRouter currently lists Nemotron 3 Ultra as a free endpoint with a 1M-token context window and describes it for deep research and complex agent workflows. OpenAI gpt-oss-20b is listed as an open-weight model with Apache 2.0 licensing and structured-output support. These are shortlist candidates, not a proven ranking of quality. OpenRouter's free-model usage rankings measure adoption, not independent performance.

Model availability, terms, rate limits, licenses, and prices can change. Confirm the current model page and terms before use.

## What the review does

After a research job completes, call `POST /jobs/:id/review`. It loads only a completed job owned by the authenticated user, then sends the question, brief, candidate records, source ledger, and claim ledger to the configured reviewer. It asks for a JSON critique of missing denominators, unclear populations or periods, unsupported trajectory statements, source/claim ID inconsistencies, missing counterevidence, possible duplicated datasets, and unresolved unknowns.

The audit is stored at `result.model_review`; prior audits are kept in `result.model_review_history`. The main research result and the job's original provider/model columns are not replaced.

The reviewer has no web-search or browser tool in this endpoint. It cannot verify that a source exists, open a URL, establish that a citation supports a claim, produce a valid ranking, or approve a stage. A clean structural review is not proof of correctness. Its output must be checked by a human.

## Configure

In the Supabase dashboard for project `xketsvvssnlhzyenmnsw`, add these Edge Function secrets:
- `OPENROUTER_API_KEY` — required to enable the optional review endpoint.
- `OPENROUTER_REVIEW_MODEL` — optional, defaults to `nvidia/nemotron-3-ultra-550b-a55b:free`.

Never place provider keys in frontend code or source control.

After deploying the updated `ivealth-research-service` Edge Function, send a POST request to the function path `/jobs/{job-id}/review` with the signed-in user's Supabase access token and project API key. The job must be `complete` or `complete_with_limitations`. This endpoint accepts at most 120,000 JSON characters per review; it returns HTTP 413 rather than silently truncating larger records.

## Privacy and cost boundaries

- Free inference does not guarantee permanent availability, unlimited throughput, or a private processing environment.
- The free NVIDIA Nemotron endpoint page states that requests may be logged and used to improve NVIDIA products and services. Do not send confidential information, private user records, personal data, or unpublished proprietary research. Use public-source research records only.
- This audit makes no web-search call. The main research run still uses its configured search provider and may incur usage charges.
- A provider outage or free-tier limit causes the review call to fail without changing the original research result.

## Evaluation before wider rollout

Build an adjudicated blind set containing fabricated-source decoys, well-served controls, viral-but-not-trajectory controls, duplicated datasets, unsupported trajectories, cross-geography generalizations, and cases with valid UNKNOWN values. Measure critical-issue recall, false-positive rate, JSON reliability, latency, uptime, privacy conditions, and false claims of source verification. Report model critiques separately from agreement among human raters.

The model must not generate the Radar ranking. Keep top-five stability testing across three alternative weightings and all human approval gates unchanged. Do not switch the primary researcher until the alternative has completed the same blind tests against the current baseline.
