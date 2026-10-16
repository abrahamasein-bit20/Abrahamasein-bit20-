-- World Concern Radar initial schema; additive, with no destructive table operations.
create extension if not exists pgcrypto;
create table if not exists public.radar_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 240),
 objective text not null, geography text, population text, time_window text, evidence_cutoff date,
 status text not null default 'in_progress' check (status in ('not_started','in_progress','blocked','complete','complete_with_limitations')),
 methodology_version text not null default 'v1', manifest jsonb not null default '{}'::jsonb,
 limitations jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.radar_sources (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.radar_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, canonical_url text, title text not null,
 publisher text, publication_date date, accessed_at timestamptz not null default now(), geography text, population text,
 source_type text not null default 'unknown' check (source_type in ('primary','synthesis','official_statistics','academic','industry','advocacy','news','unknown')),
 verification_status text not null default 'unverified' check (verification_status in ('verified','partially_verified','unverified','failed')),
 methodology jsonb not null default '{}'::jsonb, limitations text, created_at timestamptz not null default now(),
 unique (run_id, canonical_url)
);
create table if not exists public.radar_claims (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.radar_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, claim_key text,
 claim text not null check (length(trim(claim)) between 1 and 5000),
 evidence_class text not null default 'unknown' check (evidence_class in ('experienced','worried','modelled_exposure','behavior','solution_performance','trajectory','source_quality','inference','unknown')),
 status text not null default 'unknown' check (status in ('verified','partially_verified','unverified','contradicted','unknown','insufficient_evidence')),
 confidence text not null default 'unassessed' check (confidence in ('high','moderate','low','unassessed')),
 geography text, population text, period_start date, period_end date, measure text, denominator text, value_numeric numeric,
 unit text, support_summary text, limitations text, alternative_explanations jsonb not null default '[]'::jsonb,
 falsification_condition text, source_ids uuid[] not null default '{}'::uuid[], created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.radar_signal_observations (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.radar_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, claim_id uuid references public.radar_claims(id) on delete set null,
 signal_type text not null check (signal_type in ('experienced','worried','modelled_exposure','behavior','solution_performance','trajectory','source_quality')),
 signal_name text not null, observed_value jsonb, unit text, geography text, population text, period_start date, period_end date,
 denominator text, source_ids uuid[] not null default '{}'::uuid[],
 comparability text not null default 'unknown' check (comparability in ('comparable','partially_comparable','not_comparable','unknown')),
 dependency_group text, missingness_reason text, created_at timestamptz not null default now()
);
create table if not exists public.radar_audit_events (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.radar_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, event_type text not null, entity_type text, entity_id uuid,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists radar_runs_user_created_idx on public.radar_runs(user_id, created_at desc);
create index if not exists radar_claims_run_idx on public.radar_claims(run_id, created_at);
create index if not exists radar_sources_run_idx on public.radar_sources(run_id, created_at);
create index if not exists radar_signals_run_type_idx on public.radar_signal_observations(run_id, signal_type, created_at);
create index if not exists radar_audit_run_idx on public.radar_audit_events(run_id, created_at);
alter table public.radar_runs enable row level security;
alter table public.radar_sources enable row level security;
alter table public.radar_claims enable row level security;
alter table public.radar_signal_observations enable row level security;
alter table public.radar_audit_events enable row level security;
drop policy if exists "Users manage own radar runs" on public.radar_runs;
create policy "Users manage own radar runs" on public.radar_runs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own radar sources" on public.radar_sources;
create policy "Users manage own radar sources" on public.radar_sources for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own radar claims" on public.radar_claims;
create policy "Users manage own radar claims" on public.radar_claims for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own radar signals" on public.radar_signal_observations;
create policy "Users manage own radar signals" on public.radar_signal_observations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users read own radar audit events" on public.radar_audit_events;
create policy "Users read own radar audit events" on public.radar_audit_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users append own radar audit events" on public.radar_audit_events;
create policy "Users append own radar audit events" on public.radar_audit_events for insert to authenticated with check (auth.uid() = user_id);
grant select, insert, update, delete on public.radar_runs to authenticated;
grant select, insert, update, delete on public.radar_sources to authenticated;
grant select, insert, update, delete on public.radar_claims to authenticated;
grant select, insert, update, delete on public.radar_signal_observations to authenticated;
grant select, insert on public.radar_audit_events to authenticated;
