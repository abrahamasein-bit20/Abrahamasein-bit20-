# Open-Model Stack Review for iValth

Date reviewed: 2026-10-17

## Decision summary

Do not replace the current research service with a single free AI model. iValth's research quality depends on source retrieval, canonical URLs, claim-to-source traceability, counterevidence, comparable time-series, and review gates. A model endpoint alone does not supply those controls.

Recommended architecture:
1. Keep retrieval and evidence records independent of the model. Search tools return source records; store URL, title, publisher, date, geography, population, evidence tier, claim linkage, and verification state before synthesis.
2. Add a provider adapter. Keep the current OpenAI Responses API plus web search path as the baseline. Add an optional OpenAI-compatible model endpoint for secondary critique/classification, not as a silent replacement for web search.
3. Use a second model only as an adversarial reviewer. It can flag schema violations, unsupported-sounding claims, missing counterevidence, duplicate source IDs, inconsistent evidence classes, and overconfident trajectory language. Its output is a review queue, not proof that a source is true or false.
4. Require a human decision gate. No model should select the next candidate, approve a dossier, or silently discard a blind spot.
5. Benchmark before switching defaults. Run the same fixed dossier/control set through the baseline and candidate model; blind-score traceability, specificity, unsupported claims, counterevidence, and uncertainty. Keep the incumbent unless the candidate wins on measured criteria.

## GitHub projects inspected

### 1. Tongyi DeepResearch — candidate for later research-agent experiments

Repository: https://github.com/Alibaba-NLP/DeepResearch

- Public repository lists an Apache-2.0 license.
- The README describes a 30.5B-total / 3.3B-active-parameter agent model with a 128K context window, and publishes benchmark claims for long-horizon information seeking.
- It supports ReAct inference and has evaluation assets; the README also notes that the heavier inference mode is not fully open-sourced.
- Its documented setup needs Python and several external services/API keys for search, page reading, parsing and inference. A 30B-class model is not appropriate to run inside a Supabase Edge Function or Vercel serverless function.
- Assessment: strong research-agent candidate for a separately hosted benchmark; not a drop-in dependency for the current Next.js/Supabase deployment. Treat published benchmark claims as vendor-reported until reproduced on iValth's own dossier set.

### 2. OpenAI gpt-oss — candidate open-weight model family

Repository: https://github.com/openai/gpt-oss

- Investigate the exact model variant, runtime requirements, model licence and serving requirements before selecting it.
- Open weights do not mean free hosted inference. Self-hosting requires compute, operations and monitoring.
- Assessment: benchmark as a possible synthesis/critique model; do not assume it provides web search or verified citations by itself.

### 3. Qwen model family — candidate open-weight models

Repository: https://github.com/QwenLM/Qwen3

- The repository is useful for reviewing model releases and serving guidance, but model licences and hardware requirements must be checked for the exact checkpoint chosen.
- Assessment: consider a smaller instruction-tuned checkpoint for structured extraction/classification only after comparing it against a stronger model on the fixed evaluation set. Do not select by stars alone.

### 4. Ollama — local development runner, not the production host

Repository: https://github.com/ollama/ollama

- MIT-licensed runner with a REST API and support for multiple model families.
- Useful for local prompt iteration and inexpensive repeatable tests on suitable developer hardware.
- A developer's local Ollama URL is not reachable by the deployed Supabase service. Production use requires an explicitly hosted, secured endpoint.
- Assessment: good local experimentation tool; not a hosted model or a zero-cost production solution by itself.

### 5. vLLM — production inference serving for dedicated compute

Repository: https://github.com/vllm-project/vllm

- Apache-2.0 serving engine with an OpenAI-compatible API and support for many model architectures.
- Requires compatible infrastructure; GPU compute and operations are real costs.
- Assessment: use only if measured traffic and quality justify a separately hosted inference service. Not suitable for embedding directly into an Edge Function.

### 6. Deep Searcher — retrieval-augmented search over private corpora

Repository: https://github.com/zilliztech/deep-searcher

- Open-source deep-research alternative focused on reasoning and search over private data.
- It is a possible later option for searching iValth's own accumulated evidence library.
- It does not replace a robust public-web discovery, provenance, source verification and audit workflow.
- Assessment: defer until iValth has a reliable source library and a defined retrieval benchmark.

## Hosted free-tier reality

Free model usually means model weights or a limited hosted quota—not guaranteed, unlimited, zero-cost production inference.

- OpenRouter documents a free tier with free model variants and a daily request cap; its documentation currently describes 50 requests/day for free-model use, subject to account/usage conditions. Check the live account limit before depending on it: https://openrouter.ai/pricing/
- Hugging Face documents a small, changeable monthly free inference credit for free accounts; usage beyond included credits can be billed: https://huggingface.co/docs/inference-providers/en/pricing
- Public demo endpoints may be rate-limited, intermittent, or unsuitable for sensitive data. Do not send private user research or credentials to an endpoint without reviewing its terms and data handling.

These services can support a prototype, but availability, model selection, rate limits, retention and terms can change. Store provider/model identifiers and request status per run.

## Proposed integration order

### Phase A — establish baseline

- Confirm the current OpenAI key and existing research service end-to-end; current project documentation says the key/configuration and a successful end-to-end run still need verification.
- Preserve the source/claim ledgers and review gate.
- Create a small fixed evaluation pack with positive controls, a well-served problem, a viral-but-low-trajectory control, an invented decoy, and blind-spot cases.
- Freeze a baseline output and score it blind.

### Phase B — add optional model audit

- Add server-side configuration for an OpenAI-compatible critique endpoint, e.g. a provider base URL, key and exact model ID.
- Keep secrets in Supabase Edge Function Secrets only. Never expose keys in browser code or NEXT_PUBLIC environment variables.
- Send the draft research artifact and evidence metadata to the critique model. Ask it to identify internal inconsistencies and evidence gaps, not to invent replacement citations.
- Save critique output separately from original model output; show reviewer findings as unverified flags.
- Fail open to the primary artifact if the optional reviewer is unavailable, while recording audit_status=unavailable. Do not report the artifact as independently verified.

### Phase C — compare before promoting

- Run all candidate models on the same cases and same input evidence.
- Audit at least 30 randomly selected factual claims per dossier for source existence and source-claim fit.
- Require zero fabricated sources in the audit; the decoy must be classified as insufficient evidence by every rater.
- Measure ordinal inter-rater agreement, top-five overlap, control behavior, and rank stability across three alternative weightings.
- Promote a model only if blind evaluation shows an improvement in traceability and specificity without degrading safety controls.

## Non-goals

- Do not install a large research agent inside the Next.js frontend or Supabase Edge Function.
- Do not treat GitHub stars, leaderboard claims, or generated citations as proof of quality.
- Do not remove the human approval gates.
- Do not combine experienced harm, reported worry, modelled exposure, behavior and solution performance into one undifferentiated score.
- Do not describe a limited free quota as a production-grade free service.

## Current status

This file records the GitHub review and recommended architecture. It does not claim that any new model has been embedded, configured, or end-to-end tested. The current research service remains based on the Responses API plus web search until a separately tested provider integration is implemented and approved.
