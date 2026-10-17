"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

type Job = {
  id: string; title: string; research_question: string; geography: string;
  population: string; time_window: string; status: string; model?: string;
  error_summary?: string | null; created_at: string; result?: Record<string, unknown>;
};
type Health = { researchProviderConfigured?: boolean; optionalOpenModelAuditConfigured?: boolean };

export default function ModelAuditView() {
  const supabase = useMemo<SupabaseClient | null>(() => {
    try { return createClient(); } catch { return null; }
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [health, setHealth] = useState<Health>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [population, setPopulation] = useState("General population");
  const [geography, setGeography] = useState("Global");
  const [timeWindow, setTimeWindow] = useState("Latest available with comparable historical baseline");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "") + "/functions/v1/ivealth-research-service";
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const tell = (text: string, isError = false) => { setMessage(text); setError(isError); };

  const request = useCallback(async (path: string, token: string, init: RequestInit = {}) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !publicKey) {
      throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel before using the research service.");
    }
    const response = await fetch(apiBase + path, {
      ...init,
      headers: { apikey: publicKey, Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const config = Array.isArray(body.configuration_required) ? " " + body.configuration_required.join(" ") : "";
      throw new Error(String(body.error || "Research service returned HTTP " + response.status) + config);
    }
    return body;
  }, [apiBase, publicKey]);

  const reload = useCallback(async (activeSession: Session) => {
    const [status, result] = await Promise.all([
      request("/health", activeSession.access_token),
      request("/jobs", activeSession.access_token),
    ]);
    setHealth(status);
    const list: Job[] = Array.isArray(result.jobs) ? result.jobs : [];
    setJobs(list);
    setSelectedId((id) => id && list.some((job) => job.id === id) ? id : list[0]?.id || "");
  }, [request]);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
      if (alive) setAuthReady(true);
    }).catch(() => { if (alive) setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!session) { setJobs([]); setHealth({}); setSelectedId(""); return; }
    let alive = true;
    void reload(session).catch((e) => { if (alive) tell(e instanceof Error ? e.message : "Could not connect to the service.", true); });
    return () => { alive = false; };
  }, [session?.access_token, reload]);

  const selected = jobs.find((job) => job.id === selectedId) || null;
  const result = selected?.result || {};
  const modelReview = result.model_review as Record<string, unknown> | undefined;
  const audit = modelReview?.audit as Record<string, unknown> | undefined;

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { tell("Supabase browser configuration is missing.", true); return; }
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        tell(data.session ? "Account created." : "Sign-up submitted. Check your email to confirm, then sign in.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        tell("Signed in.");
      }
      setPassword("");
    } catch (e) { tell(e instanceof Error ? e.message : "Sign-in failed.", true); }
    finally { setBusy(false); }
  };

  const createJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    if (!title.trim() || question.trim().length < 10) { tell("Enter a title and a research question of at least 10 characters.", true); return; }
    setBusy(true);
    try {
      const payload = await request("/jobs", session.access_token, { method: "POST", body: JSON.stringify({
        title: title.trim(), research_question: question.trim(), geography, population,
        time_window: timeWindow,
      }) });
      if (payload.job) setSelectedId(payload.job.id);
      await reload(session);
      tell("Research job created. Check its status and evidence limits before relying on the result.");
    } catch (e) {
      tell(e instanceof Error ? e.message : "Research request failed.", true);
      await reload(session).catch(() => undefined);
    } finally { setBusy(false); }
  };

  const runAudit = async () => {
    if (!session || !selected) return;
    setBusy(true);
    try {
      const payload = await request("/jobs/" + encodeURIComponent(selected.id) + "/review", session.access_token, { method: "POST", body: "{}" });
      if (payload.job) setJobs((all) => all.map((job) => job.id === selected.id ? payload.job : job));
      tell("Audit saved. Verify flags against primary sources; the model does not verify URLs or approve candidates.");
    } catch (e) { tell(e instanceof Error ? e.message : "Audit failed.", true); }
    finally { setBusy(false); }
  };

  if (!authReady) return <section className="surface-panel model-audit-panel">Checking authentication…</section>;

  return <div className="view-stack model-audit-view">
    <div className="page-intro"><div><div className="eyebrow">OPEN-WEIGHT MODEL · RESEARCH QA</div><h1>AI research audit</h1><p>Run a source-led research scan, then use a free hosted open-weight model to critique traceability and consistency. It cannot independently verify sources or make decisions.</p></div>
      {session && <button className="secondary-button" disabled={busy} onClick={() => void supabase?.auth.signOut()}>Sign out</button>}
    </div>
    {message && <div className={error ? "feedback feedback-error" : "feedback feedback-success"} role={error ? "alert" : "status"}>{message}</div>}
    {!session ? <section className="surface-panel model-audit-panel">
      <h2>{authMode === "signin" ? "Sign in to iValth Research Service" : "Create a research account"}</h2>
      <p>These backend jobs are stored separately from runs in your browser workspace.</p>
      {!supabase && <p className="model-audit-warning">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the workspace deployment environment.</p>}
      <form className="model-audit-form" onSubmit={signIn}>
        <label className="form-field"><span className="field-label">Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="form-field"><span className="field-label">Password</span><input type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <div className="model-audit-actions"><button className="primary-button" disabled={busy || !supabase}>{busy ? "Please wait…" : authMode === "signin" ? "Sign in" : "Create account"}</button><button className="text-button" type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>{authMode === "signin" ? "Need an account?" : "Already registered? Sign in"}</button></div>
      </form>
    </section> : <>
      <div className="model-audit-status-grid">
        <section className="surface-panel model-audit-status"><span>Research provider</span><strong>{health.researchProviderConfigured ? "Configured" : "Needs setup"}</strong><p>OpenAI API with web search</p></section>
        <section className="surface-panel model-audit-status"><span>Free-model audit</span><strong>{health.optionalOpenModelAuditConfigured ? "Configured" : "Needs setup"}</strong><p>OpenRouter · Nemotron 3 Ultra endpoint</p></section>
        <section className="surface-panel model-audit-status"><span>Account</span><strong>{session.user.email || "Authenticated"}</strong><p>Only your own jobs are listed</p></section>
      </div>
      <section className="surface-panel model-audit-panel"><h2>Start a research scan</h2><p>Start a separate authenticated backend job. Existing browser-local records are not silently copied.</p>
        <form className="model-audit-form" onSubmit={createJob}>
          <label className="form-field"><span className="field-label">Run title</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={240} required placeholder="e.g. Young adult social connection" /></label>
          <label className="form-field"><span className="field-label">Research question</span><textarea value={question} onChange={(e) => setQuestion(e.target.value)} minLength={10} maxLength={5000} rows={4} required placeholder="Which wellbeing concerns are emerging or worsening, for whom, and what remains unknown?" /></label>
          <div className="model-audit-grid">
            <label className="form-field"><span className="field-label">Population</span><input value={population} onChange={(e) => setPopulation(e.target.value)} maxLength={500} /></label>
            <label className="form-field"><span className="field-label">Geography</span><select value={geography} onChange={(e) => setGeography(e.target.value)}><option>Global</option><option>Regional</option><option>Country-specific</option><option>Local</option></select></label>
            <label className="form-field model-audit-full"><span className="field-label">Time window</span><input value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} maxLength={300} /></label>
          </div>
          <div className="model-audit-actions"><button className="primary-button" disabled={busy || !health.researchProviderConfigured}>{busy ? "Working…" : "Run research scan"}</button><span>Requires OPENAI_API_KEY in Supabase Edge Function secrets.</span></div>
        </form>
      </section>
      <div className="model-audit-results-grid">
        <section className="surface-panel model-audit-panel"><div className="panel-heading"><div><h2>Saved research jobs</h2><p>{jobs.length} jobs for this account</p></div><button className="secondary-button" onClick={() => void reload(session)} disabled={busy}>Refresh</button></div>
          {jobs.length ? <div className="model-audit-job-list">{jobs.map((job) => <button type="button" key={job.id} className={"model-audit-job " + (selectedId === job.id ? "selected" : "")} onClick={() => setSelectedId(job.id)}><span><strong>{job.title}</strong><b className={"job-status job-status-" + job.status}>{job.status.replaceAll("_", " ")}</b></span><small>{new Date(job.created_at).toLocaleString()}</small><p>{job.research_question}</p></button>)}</div> : <p>No backend research jobs yet.</p>}
        </section>
        <section className="surface-panel model-audit-panel"><h2>Review selected job</h2>
          {!selected ? <p>Select a saved job. A successful research run is required before auditing.</p> : <>
            <h3>{selected.title}</h3><p>{selected.geography} · {selected.population} · {selected.time_window}</p><p>Status: <strong>{selected.status.replaceAll("_", " ")}</strong> · Research model: <strong>{selected.model || "not recorded"}</strong></p>
            {selected.error_summary && <div className="model-audit-warning">{selected.error_summary}</div>}
            {audit && <div className="model-audit-review"><p><strong>Audit status: {String(audit.audit_status || "unknown")}</strong></p><p>{String(audit.summary || "No summary supplied.")}</p><p className="muted-note">Model review is advisory. Sources were not opened or verified.</p><details><summary>View structured audit</summary><pre className="model-audit-json">{JSON.stringify(modelReview, null, 2)}</pre></details></div>}
            <details><summary>View research record</summary><pre className="model-audit-json">{JSON.stringify(selected.result || {}, null, 2)}</pre></details>
            <div className="model-audit-actions"><button className="primary-button" onClick={() => void runAudit()} disabled={busy || !health.optionalOpenModelAuditConfigured || !["complete", "complete_with_limitations"].includes(selected.status)}>{busy ? "Auditing…" : audit ? "Run audit again" : "Run free-model audit"}</button><span>Requires OPENROUTER_API_KEY; no web-search call is made by the review pass.</span></div>
          </>}
        </section>
      </div>
      <div className="local-data-note"><strong>Storage boundary:</strong> browser-local Research Studio runs remain separate from these Supabase jobs. Only non-sensitive records built from public-source material should be sent to the free hosted review endpoint.</div>
    </>}
  </div>;
}
