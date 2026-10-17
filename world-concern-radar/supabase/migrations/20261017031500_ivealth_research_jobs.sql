create table if not exists public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  research_question text not null check (length(trim(research_question)) between 10 and 5000),
  geography text not null default 'Global',
  population text not null default 'General population',
  time_window text not null default 'Latest available with comparable historical baseline',
  evidence_cutoff date not null default current_date,
  status text not null default 'queued' check (status in ('queued','running','complete','complete_with_limitations','failed')),
  provider text not null default 'openai_responses_web_search',
  model text not null default 'gpt-4.1',
  result jsonb not null default '{}'::jsonb,
  error_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_jobs_user_created_idx on public.research_jobs(user_id, created_at desc);
create index if not exists research_jobs_status_created_idx on public.research_jobs(status, created_at);
alter table public.research_jobs enable row level security;
drop policy if exists "Users can view own research jobs" on public.research_jobs;
create policy "Users can view own research jobs" on public.research_jobs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own research jobs" on public.research_jobs;
create policy "Users can create own research jobs" on public.research_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own research jobs" on public.research_jobs;
create policy "Users can update own research jobs" on public.research_jobs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
