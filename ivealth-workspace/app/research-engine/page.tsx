"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Candidate = {
  id?: string;
  problem_statement?: string;
  population?: string;
  geography?: string;
  experienced_evidence_summary?: string;
  worried_evidence_summary?: string;
  modelled_exposure_summary?: string;
  behavior_summary?: string;
  trajectory_status?: string;
  counterevidence?: unknown[];
  alternative_explanations?: unknown[];
  unresolved_questions?: unknown[];
  source_ids?: string[];
};
type SourceRecord = {
  id?: string;
  publisher?: string;
  exact_title?: string;
  publication_date?: string;
  canonical_url?: string;
  evidence_tier?: string;
  evidence_class?: string;
  geography?: string;
  population?: string;
  measure_and_denominator?: string;
  period?: string;
  limitations?: string;
  verification_status?: string;
};
type ClaimRecord = {
  id?: string;
  claim?: string;
  source_ids?: string[];
  evidence_class?: string;
  status?: string;
  limitations?: string;
};
type AuditFinding = {
  severity?: string;
  category?: string;
  location?: string;
  observation?: string;
  why_it_matters?: string;
  recommended_check?: string;
};
type ModelAudit = {
  status?: string;
  scope_note?: string;
  model?: string;
  reviewed_at?: string;
  independent_source_verification?: boolean;
  human_review_required?: boolean;
  findings?: AuditFinding[];
  limitations?: string[];
};
type ResearchResult = {
  research_brief?: {
    question?: string;
    scope?: string;
    method?: string;
    sources_searched?: string[];
    limitations?: string[];
  };
  candidates?: Candidate[];
  source_ledger?: SourceRecord[];
  claim_ledger?: ClaimRecord[];
  model_audit?: ModelAudit;
  status?: string;
  [key: string]: unknown;
};
type ResearchJob = {
  id: string;
  title: string;
  status: string;
  model?: string;
  error_summary?: string | null;
  result?: ResearchResult;
  created_at?: string;
};
type ConnectionState = "checking" | "ready" | "config_missing" | "signed_out" | "error";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const cardStyle: React.CSSProperties = {
  background: "var(--panel, #ffffff)",
  border: "1px solid var(--line, #dfe6df)",
  borderRadius: 14,
  padding: 18,
};
const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line, #dfe6df)",
  borderRadius: 9,
  padding: "11px 12px",
  background: "var(--panel, #ffffff)",
  color: "var(--text, #17231f)",
  font: "inherit",
};
const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: "11px 15px",
  background: "#215b48",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};
const mutedStyle: React.CSSProperties = { color: "var(--muted, #66766d)", fontSize: 13, lineHeight: 1.6 };
const statusStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 9,
  background: "var(--surface, #f4f7f3)",
  border: "1px solid var(--line, #dfe6df)",
  fontSize: 13,
  lineHeight: 1.6,
};

function textOf(value: unknown, fallback = "UNKNOWN"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(item => textOf(item, "")).filter(Boolean).join("; ") || fallback;
  return fallback;
}
function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => textOf(item, "")).filter(Boolean) : [];
}
function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) + ".json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export default function ResearchEnginePage() {
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("World concern scan");
  const [question, setQuestion] = useState("");
  const [geography, setGeography] = useState("Global");
  const [population, setPopulation] = useState("General population");
  const [timeWindow, setTimeWindow] = useState("2020–2026, with comparable historical baseline where available");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [confirmExternalProcessing, setConfirmExternalProcessing] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) {
      setConnection("config_missing");
      return;
    }
    try {
      const supabase = createClient();
      let alive = true;
      supabase.auth.getUser().then(({ data, error: authError }) => {
        if (!alive) return;
        if (authError) {
          setConnection("error");
          setError(authError.message);
          return;
        }
        if (!data.user) {
          setConnection("signed_out");
          return;
        }
        setEmail(data.user.email ?? "");
        setConnection("ready");
      }).catch((authError: unknown) => {
        if (!alive) return;
        setConnection("error");
        setError(authError instanceof Error ? authError.message : "Could not check the signed-in session.");
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return;
        if (session?.user) {
          setEmail(session.user.email ?? "");
          setConnection("ready");
        } else {
          setConnection("signed_out");
        }
      });
      return () => {
        alive = false;
        listener.subscription.unsubscribe();
      };
    } catch (authError) {
      setConnection("config_missing");
      setError(authError instanceof Error ? authError.message : "Supabase is not configured.");
    }
  }, []);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase configuration is missing.");
    const supabase = createClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!data.session?.access_token) throw new Error("Your session has expired. Sign in again.");
    return {
      apikey: supabaseKey,
      Authorization: "Bearer " + data.session.access_token,
      "Content-Type": "application/json",
    };
  }

  async function parseResponse(response: Response): Promise<Record<string, unknown>> {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const parts = [textOf((body as Record<string, unknown>).error, "Request failed with HTTP " + response.status)];
      if ((body as Record<string, unknown>).configuration_required) {
        parts.push("Required provider configuration: " + textOf((body as Record<string, unknown>).configuration_required, ""));
      }
      if ((body as Record<string, unknown>).required_secrets) {
        parts.push("Required server secrets: " + textOf((body as Record<string, unknown>).required_secrets, ""));
      }
      if ((body as Record<string, unknown>).notice) parts.push(textOf((body as Record<string, unknown>).notice, ""));
      throw new Error(parts.filter(Boolean).join("\n\n"));
    }
    return body as Record<string, unknown>;
  }

  async function runResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setJob(null);
    setConfirmExternalProcessing(false);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(supabaseUrl + "/functions/v1/ivealth-research-service/jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          research_question: question.trim(),
          geography: geography.trim() || "Global",
          population: population.trim() || "General population",
          time_window: timeWindow.trim() || "Latest available with comparable baseline",
        }),
      });
      const body = await parseResponse(response);
      const saved = body.job as ResearchJob | undefined;
      if (!saved?.id) throw new Error("The research service returned no saved job ID.");
      setJob(saved);
      setMessage("Research request saved. Treat this first pass as provisional and review the source and claim ledgers before making a decision.");
      if (saved.status === "failed") setError(saved.error_summary || "The research job failed.");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "The research request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function runAudit() {
    if (!job?.id) return;
    if (!confirmExternalProcessing) {
      setError("Confirm external processing before sending this artifact to the configured model provider.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(supabaseUrl + "/functions/v1/ivealth-model-audit", {
        method: "POST",
        headers,
        body: JSON.stringify({ job_id: job.id, confirm_external_processing: true }),
      });
      const body = await parseResponse(response);
      const saved = body.job as ResearchJob | undefined;
      if (!saved?.id) throw new Error("The audit service returned no saved job.");
      setJob(saved);
      setMessage("The model critique was saved. Its findings are unverified review flags, not independent source verification.");
      setConfirmExternalProcessing(false);
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : "The model audit could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const result = job?.result;
  const audit = result?.model_audit;
  const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
  const sources = Array.isArray(result?.source_ledger) ? result.source_ledger : [];
  const claims = Array.isArray(result?.claim_ledger) ? result.claim_ledger : [];

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px 72px", color: "var(--text, #17231f)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <a href="/" style={{ color: "#215b48", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Back to Research Studio</a>
          <p style={{ margin: "18px 0 6px", fontSize: 11, letterSpacing: 1.5, fontWeight: 800, color: "var(--muted, #66766d)" }}>IVALTh · RESEARCH ENGINE</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: -1.3, margin: "0 0 10px" }}>Evidence-led research run</h1>
          <p style={{ ...mutedStyle, maxWidth: 740, margin: 0 }}>Run a bounded first-pass World Concern Radar scan, save the source and claim ledgers in Supabase, then optionally request a second-model critique. Human approval remains mandatory.</p>
        </div>
        <div style={{ ...cardStyle, padding: "10px 13px", minWidth: 190 }}>
          <div style={{ fontSize: 11, color: "var(--muted, #66766d)", marginBottom: 3 }}>SESSION</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{connection === "ready" ? (email || "Signed in") : connection === "checking" ? "Checking…" : connection === "signed_out" ? "Not signed in" : connection === "config_missing" ? "Needs configuration" : "Connection error"}</div>
        </div>
      </header>

      {connection === "config_missing" && <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Supabase configuration is missing</h2>
        <p style={mutedStyle}>Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the workspace deployment, then redeploy. These are the public client URL and key; never put a service-role key in the browser.</p>
        <a href="/setup" style={{ color: "#215b48", fontWeight: 700 }}>Open setup instructions</a>
      </section>}

      {connection === "signed_out" && <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Sign in to use the research API</h2>
        <p style={mutedStyle}>Research runs are saved to the authenticated user's Supabase record. The API does not accept anonymous requests.</p>
        <a href="/login" style={{ display: "inline-block", ...buttonStyle, textDecoration: "none" }}>Sign in</a>
      </section>}

      {connection === "error" && <p role="alert" style={{ ...statusStyle, color: "#8d2c20", marginBottom: 18 }}>{error || "Unable to connect to Supabase."}</p>}
      {message && <p role="status" style={{ ...statusStyle, marginBottom: 18 }}>{message}</p>}
      {error && connection !== "error" && <pre role="alert" style={{ ...statusStyle, color: "#8d2c20", whiteSpace: "pre-wrap", margin: "0 0 18px", fontFamily: "inherit" }}>{error}</pre>}

      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>1. Define the research request</h2>
            <p style={{ ...mutedStyle, margin: 0 }}>Narrow scope improves the interpretability of the first pass. Trajectory should remain UNKNOWN when comparable historical measures are absent.</p>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted, #66766d)" }}>Saved to Supabase when submitted</span>
        </div>
        <form onSubmit={runResearch} style={{ display: "grid", gap: 14, marginTop: 20 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Run title
            <input required maxLength={240} value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Research question
            <textarea required minLength={10} maxLength={5000} rows={4} value={question} onChange={e => setQuestion(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} placeholder="What evidence-backed wellbeing concerns are emerging or worsening, for whom, and what remains uncertain?" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Geography
              <input value={geography} maxLength={200} onChange={e => setGeography(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Population
              <input value={population} maxLength={500} onChange={e => setPopulation(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>Time window / baseline
              <input value={timeWindow} maxLength={300} onChange={e => setTimeWindow(e.target.value)} style={fieldStyle} />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-start", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="submit" disabled={busy || connection !== "ready"} style={{ ...buttonStyle, opacity: busy || connection !== "ready" ? 0.6 : 1 }}>{busy ? "Working…" : "Run research"}</button>
            <span style={mutedStyle}>Uses the configured research provider. If its server key is missing, the API returns a configuration error rather than fabricating a result.</span>
          </div>
        </form>
      </section>

      {job && <section style={{ display: "grid", gap: 18 }}>
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3, color: "var(--muted, #66766d)", margin: "0 0 5px" }}>RESEARCH JOB</p>
              <h2 style={{ fontSize: 20, margin: "0 0 7px" }}>{job.title}</h2>
              <p style={{ ...mutedStyle, margin: 0, overflowWrap: "anywhere" }}>Job ID: {job.id}</p>
              <p style={{ ...mutedStyle, margin: "5px 0 0" }}>Status: <strong>{job.status}</strong>{job.model ? " · Model: " + job.model : ""}</p>
            </div>
            <button type="button" onClick={() => downloadJson(job.title || "ivealth-research", job)} style={{ ...buttonStyle, background: "#e9f1ea", color: "#215b48" }}>Export job JSON</button>
          </div>
          {job.error_summary && <p role="alert" style={{ ...statusStyle, color: "#8d2c20", marginBottom: 0 }}>{job.error_summary}</p>}
        </section>

        {result && <section style={cardStyle}>
          <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>2. Candidate register</h2>
          <p style={mutedStyle}>First-pass outputs are provisional. Candidate selection and all stage approvals remain human decisions; model output is not a complete global census.</p>
          {result.research_brief && <details style={{ margin: "12px 0", borderTop: "1px solid var(--line, #dfe6df)", paddingTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Research method and limitations</summary>
            <pre style={{ whiteSpace: "pre-wrap", font: "12px/1.7 ui-monospace, monospace", overflowWrap: "anywhere" }}>{JSON.stringify(result.research_brief, null, 2)}</pre>
          </details>}
          {candidates.length === 0 ? <p style={mutedStyle}>No candidate records were returned. Check job status and the saved result before retrying.</p> :
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {candidates.map((candidate, index) => <article key={candidate.id || index} style={{ border: "1px solid var(--line, #dfe6df)", borderRadius: 11, padding: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14 }}>{textOf(candidate.id, "Candidate " + (index + 1))}</strong>
                  <span style={{ ...mutedStyle, fontSize: 11 }}>Trajectory: {textOf(candidate.trajectory_status)}</span>
                </div>
                <h3 style={{ fontSize: 16, lineHeight: 1.5, margin: "6px 0 9px" }}>{textOf(candidate.problem_statement, "Problem statement not provided")}</h3>
                <p style={mutedStyle}><strong>Population:</strong> {textOf(candidate.population)} · <strong>Geography:</strong> {textOf(candidate.geography)}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
                  <div style={{ background: "var(--surface, #f4f7f3)", borderRadius: 8, padding: 11 }}><div style={{ fontSize: 11, fontWeight: 800, marginBottom: 5 }}>EXPERIENCED EVIDENCE</div><p style={{ ...mutedStyle, margin: 0 }}>{textOf(candidate.experienced_evidence_summary)}</p></div>
                  <div style={{ background: "var(--surface, #f4f7f3)", borderRadius: 8, padding: 11 }}><div style={{ fontSize: 11, fontWeight: 800, marginBottom: 5 }}>REPORTED WORRY</div><p style={{ ...mutedStyle, margin: 0 }}>{textOf(candidate.worried_evidence_summary)}</p></div>
                  <div style={{ background: "var(--surface, #f4f7f3)", borderRadius: 8, padding: 11 }}><div style={{ fontSize: 11, fontWeight: 800, marginBottom: 5 }}>MODELLED EXPOSURE</div><p style={{ ...mutedStyle, margin: 0 }}>{textOf(candidate.modelled_exposure_summary)}</p></div>
                </div>
                <details style={{ marginTop: 11 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>Counterevidence, competing explanations and evidence IDs</summary>
                  <pre style={{ whiteSpace: "pre-wrap", font: "12px/1.7 ui-monospace, monospace", overflowWrap: "anywhere" }}>{JSON.stringify({ behavior: candidate.behavior_summary, counterevidence: candidate.counterevidence, alternative_explanations: candidate.alternative_explanations, unresolved_questions: candidate.unresolved_questions, source_ids: candidate.source_ids }, null, 2)}</pre>
                </details>
              </article>)}
            </div>}
        </section>}

        {result && <section style={cardStyle}>
          <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>3. Evidence traceability</h2>
          <p style={mutedStyle}>Source records and claims are shown separately. A generated URL is not itself proof that the source exists or supports the claim.</p>
          <details open style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Source ledger ({sources.length})</summary>
            {sources.length === 0 ? <p style={mutedStyle}>No source rows returned.</p> : <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {sources.map((source, index) => {
                const url = safeWebUrl(source.canonical_url);
                return <article key={source.id || index} style={{ border: "1px solid var(--line, #dfe6df)", borderRadius: 9, padding: 12 }}>
                  <strong>{textOf(source.id, "Source " + (index + 1))} · {textOf(source.evidence_tier)}</strong>
                  <p style={{ margin: "5px 0", fontWeight: 700, fontSize: 13 }}>{textOf(source.exact_title, "Title unknown")}</p>
                  <p style={{ ...mutedStyle, margin: "3px 0" }}>{textOf(source.publisher)} · {textOf(source.publication_date)} · {textOf(source.evidence_class)}</p>
                  <p style={{ ...mutedStyle, margin: "3px 0" }}>Geography: {textOf(source.geography)} · Population: {textOf(source.population)} · Period: {textOf(source.period)}</p>
                  <p style={{ ...mutedStyle, margin: "3px 0" }}>Measure / denominator: {textOf(source.measure_and_denominator)}</p>
                  <p style={{ ...mutedStyle, margin: "3px 0" }}>Verification: {textOf(source.verification_status)} · Limitations: {textOf(source.limitations)}</p>
                  {url && <a href={url} target="_blank" rel="noreferrer" style={{ color: "#215b48", fontSize: 12, overflowWrap: "anywhere" }}>{url}</a>}
                </article>;
              })}
            </div>}
          </details>
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Claim ledger ({claims.length})</summary>
            {claims.length === 0 ? <p style={mutedStyle}>No claim rows returned.</p> : <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {claims.map((claim, index) => <article key={claim.id || index} style={{ border: "1px solid var(--line, #dfe6df)", borderRadius: 9, padding: 12 }}>
                <strong style={{ fontSize: 12 }}>{textOf(claim.id, "Claim " + (index + 1))} · {textOf(claim.status)}</strong>
                <p style={{ margin: "5px 0", fontSize: 13, lineHeight: 1.6 }}>{textOf(claim.claim, "Claim text unavailable")}</p>
                <p style={{ ...mutedStyle, margin: "3px 0" }}>Evidence class: {textOf(claim.evidence_class)} · Source IDs: {listOf(claim.source_ids).join(", ") || "UNKNOWN"}</p>
                <p style={{ ...mutedStyle, margin: "3px 0" }}>Limitations: {textOf(claim.limitations)}</p>
              </article>)}
            </div>}
          </details>
        </section>}

        {result && <section style={cardStyle}>
          <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>4. Optional second-model critique</h2>
          <p style={mutedStyle}>The reviewer flags internal risks and gaps. It does not browse source URLs, validate the truth of claims, rank candidates, or approve a stage.</p>
          {!audit && <div style={{ marginTop: 14, border: "1px solid #e6cda6", background: "#fff9ee", borderRadius: 9, padding: 13 }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>The external provider will receive the saved research artifact. The free Nemotron endpoint currently discloses that usage may be logged and used for service improvement, and says not to submit confidential information or personal data. Use only synthetic/public non-confidential research unless you have independently reviewed and approved the provider's terms.</p>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12, lineHeight: 1.6 }}>
              <input type="checkbox" checked={confirmExternalProcessing} onChange={e => setConfirmExternalProcessing(e.target.checked)} style={{ marginTop: 3 }} />
              I have reviewed the data handling implications and authorize sending this research artifact to the configured external model for a critique only.
            </label>
            <button type="button" disabled={busy || !confirmExternalProcessing || connection !== "ready"} onClick={runAudit} style={{ ...buttonStyle, marginTop: 13, opacity: busy || !confirmExternalProcessing || connection !== "ready" ? 0.6 : 1 }}>{busy ? "Working…" : "Run model critique"}</button>
          </div>}
          {audit && <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={statusStyle}><strong>Model status:</strong> {textOf(audit.status)} · <strong>Model:</strong> {textOf(audit.model, "not recorded")} · <strong>Human review required:</strong> {audit.human_review_required === false ? "No" : "Yes"}</div>
            <p style={mutedStyle}>{textOf(audit.scope_note, "This is an automated critique and not independent source verification.")}</p>
            {!audit.findings?.length && <p style={mutedStyle}>No findings returned. This does not certify that the claims or sources are correct.</p>}
            {audit.findings?.map((finding, index) => <article key={index} style={{ border: "1px solid var(--line, #dfe6df)", borderRadius: 9, padding: 12 }}>
              <strong style={{ fontSize: 12 }}>{textOf(finding.severity)} · {textOf(finding.category)}</strong>
              <p style={{ fontSize: 13, margin: "5px 0", lineHeight: 1.6 }}><strong>{textOf(finding.location)}:</strong> {textOf(finding.observation)}</p>
              <p style={{ ...mutedStyle, margin: "5px 0" }}>{textOf(finding.why_it_matters)}</p>
              <p style={{ ...mutedStyle, margin: "5px 0" }}><strong>Human check:</strong> {textOf(finding.recommended_check)}</p>
            </article>)}
            {!!audit.limitations?.length && <div style={statusStyle}><strong>Limitations</strong><ul>{audit.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul></div>}
            <button type="button" onClick={() => downloadJson("ivealth-model-audit-" + job.id, audit)} style={{ ...buttonStyle, width: "fit-content", background: "#e9f1ea", color: "#215b48" }}>Export critique JSON</button>
          </div>}
        </section>}
      </section>}

      <footer style={{ ...mutedStyle, marginTop: 22, fontSize: 11 }}>
        Research jobs are persisted to Supabase under the signed-in user. The browser-only Research Studio runs are not automatically imported here. Provider credentials stay server-side. All model outputs remain provisional pending source-level verification and human review.
      </footer>
    </main>
  );
}
