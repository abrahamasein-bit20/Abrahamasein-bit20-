# iValth Wellbeing Research Workspace

Initial internal workspace scaffold for iValth. This UI establishes the intended staged workflow and governance requirements; it is not yet a production research system.

## Stages and approval gates
0. Wellbeing Research — approve scope before detection.
1. World Concern Radar — reviewer selects candidate problem IDs for deeper work.
2. Problem Validation — approve, request evidence, revise, or stop.
3. Opportunity Validation — proceed only after explicit approval.
4. Product Development — approve a specific experiment/build action.

## Current status
- Dashboard UI: initial scaffold.
- Supabase authentication: not yet wired.
- Persisted stage approvals: not yet implemented.
- Evidence API integration: not yet implemented.
- End-to-end security and workflow tests: not yet run.

## Environment
Copy `.env.example` to `.env.local` and configure the public Supabase URL and anon/publishable key after authentication is implemented. Never place a service-role key in browser-visible environment variables.

## Development
`npm install`
`npm run dev`
