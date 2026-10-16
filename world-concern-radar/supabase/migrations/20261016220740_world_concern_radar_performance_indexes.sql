-- Follow-up indexes and row-level security policy expression optimization.
create index if not exists radar_runs_user_id_idx on public.radar_runs(user_id);
create index if not exists radar_sources_user_id_idx on public.radar_sources(user_id);
create index if not exists radar_claims_user_id_idx on public.radar_claims(user_id);
create index if not exists radar_signal_user_id_idx on public.radar_signal_observations(user_id);
create index if not exists radar_audit_user_id_idx on public.radar_audit_events(user_id);
create index if not exists radar_signal_claim_id_idx on public.radar_signal_observations(claim_id);
drop policy if exists "Users manage own radar runs" on public.radar_runs;
create policy "Users manage own radar runs" on public.radar_runs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own radar sources" on public.radar_sources;
create policy "Users manage own radar sources" on public.radar_sources for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own radar claims" on public.radar_claims;
create policy "Users manage own radar claims" on public.radar_claims for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own radar signals" on public.radar_signal_observations;
create policy "Users manage own radar signals" on public.radar_signal_observations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own radar audit events" on public.radar_audit_events;
create policy "Users read own radar audit events" on public.radar_audit_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users append own radar audit events" on public.radar_audit_events;
create policy "Users append own radar audit events" on public.radar_audit_events for insert to authenticated with check ((select auth.uid()) = user_id);
