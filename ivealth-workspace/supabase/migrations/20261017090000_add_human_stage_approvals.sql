create table if not exists public.radar_stage_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.radar_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage = any (array['wellbeing_research','world_concern_radar','problem_validation','opportunity_validation','product_development'])),
  decision text not null check (decision = any (array['approved','selected_items','request_more_evidence','revise','stop','rejected'])),
  selected_item_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_item_ids) = 'array'),
  rationale text not null check (length(trim(rationale)) >= 1),
  artifact_version text not null,
  approved_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint radar_stage_approvals_user_run_unique unique (id, run_id, user_id)
);
create index if not exists radar_stage_approvals_run_created_idx on public.radar_stage_approvals(run_id, created_at desc);
create index if not exists radar_stage_approvals_user_run_idx on public.radar_stage_approvals(user_id, run_id);
alter table public.radar_stage_approvals enable row level security;
drop policy if exists "Users can view own stage approvals" on public.radar_stage_approvals;
create policy "Users can view own stage approvals" on public.radar_stage_approvals for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own stage approvals" on public.radar_stage_approvals;
create policy "Users can create own stage approvals" on public.radar_stage_approvals for insert to authenticated with check ((select auth.uid()) = user_id and (select auth.uid()) = approved_by and exists (select 1 from public.radar_runs r where r.id = run_id and r.user_id = (select auth.uid())));
