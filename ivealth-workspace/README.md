# iValth Wellbeing Research Workspace

A staged research workflow prototype for iValth. The current app provides an interactive workflow and persists research runs in the current browser's local storage.

## Workflow stages
0. **Wellbeing Research** — define research question, population, geography and time horizon; require an explicit scope decision.
1. **World Concern Radar** — maintain a candidate problem pool with population, geography, signal, evidence and counterevidence; select specific problem IDs to advance.
2. **Problem Validation** — review selected IDs and record approve / request evidence / revise / stop decisions.
3. **Opportunity Validation** — separate opportunity assessment from the Radar and Problem Validation.
4. **Product Development** — record a decision about a product experiment.

## Current limitations — read before use
- Authentication is intentionally deferred at the user's request. The workspace is **not access-protected**.
- Run data is saved to browser local storage only. It does not sync between devices or users and may be lost if browser data is cleared.
- The app does **not** currently write research data to Supabase. Supabase writes are not enabled because a public unauthenticated write path would expose shared research data.
- The candidate register is a manual evidence-entry workflow, not an automatic web-crawling or AI research engine.
- Decisions are stored locally and are not server-enforced. Do not treat them as tamper-resistant approvals.
- Do not enter confidential, personal, or sensitive research data until authentication, server-side authorization, database persistence and workflow enforcement have been implemented and tested.

## Environment
The app includes the Supabase public URL/key configuration and login components for later use. These are not required for local-storage prototype operation. Never put a Supabase service-role key in a browser-visible environment variable.

## Development
`npm install`
`npm run dev`

## Next production milestones
1. Restore and test authenticated access.
2. Add user/team ownership to research runs and related records.
3. Integrate the run/source/claim/signal/approval tables through an authenticated API.
4. Enforce stage transitions on the server, including version-bound decisions and selected item IDs.
5. Add tests for permissions, bypass attempts, revisions, stop decisions and auditability.
