import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const json = async (req: Request) => { try { return await req.json(); } catch { return null; } };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return reply({ error: "Server Supabase configuration is incomplete." }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || token === authHeader) return reply({ error: "A valid Supabase user access token is required." }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData.user) return reply({ error: "Authentication failed. Sign in to iValth and retry." }, 401);
  const user = userData.user;
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const base = parts.indexOf("ivealth-research-service");
  const route = parts.slice(base + 1);
  if (route[0] === "health" && req.method === "GET") {
    return reply({ service: "ivealth-research-service", status: "ready", userAuthenticated: true, researchProviderConfigured: Boolean(Deno.env.get("OPENAI_API_KEY")), provider: "OpenAI Responses API with web search", note: "This service performs a research pass on request; it is not a continuous crawler." });
  }
  if (route[0] === "jobs" && route.length === 1 && req.method === "GET") {
    const { data, error } = await db.from("research_jobs").select("id,title,research_question,geography,population,time_window,evidence_cutoff,status,provider,model,error_summary,started_at,completed_at,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (error) return reply({ error: "Could not list research jobs." }, 500);
    return reply({ jobs: data ?? [] });
  }
  if (route[0] === "jobs" && route.length === 1 && req.method === "POST") {
    const body = await json(req);
    if (!body || typeof body.title !== "string" || typeof body.research_question !== "string" || body.title.trim().length < 1 || body.title.length > 240 || body.research_question.trim().length < 10 || body.research_question.length > 5000) {
      return reply({ error: "Provide a title and a research_question between 10 and 5000 characters." }, 400);
    }
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const payload = {
      user_id: user.id,
      title: body.title.trim(),
      research_question: body.research_question.trim(),
      geography: String(body.geography || "Global").slice(0, 200),
      population: String(body.population || "General population").slice(0, 500),
      time_window: String(body.time_window || "Latest available with comparable historical baseline").slice(0, 300),
      evidence_cutoff: String(body.evidence_cutoff || new Date().toISOString().slice(0, 10)),
      status: openaiKey ? "running" : "failed",
      error_summary: openaiKey ? null : "OPENAI_API_KEY is not configured in Supabase Edge Function secrets.",
      started_at: openaiKey ? new Date().toISOString() : null,
      completed_at: openaiKey ? null : new Date().toISOString(),
    };
    const { data: job, error: insertError } = await db.from("research_jobs").insert(payload).select("*").single();
    if (insertError || !job) return reply({ error: "Could not create research job. Check the research_jobs migration." }, 500);
    if (!openaiKey) return reply({ job, configuration_required: ["Set OPENAI_API_KEY as a Supabase Edge Function secret, then retry."] }, 503);

    const systemPrompt = `You are iValth's independent, evidence-led wellbeing research service. Follow these constraints strictly:
- Do not invent sources, URLs, publication dates, sample sizes, findings, trend values, or tool use.
- Use web search to find primary sources, official statistics, systematic reviews and peer-reviewed research first. Verify claims against source pages where possible.
- Return a JSON object only, matching the schema described by the user. If data is not established, write UNKNOWN; not found is not proof of absence.
- Keep EXPERIENCED (measured harm/prevalence/outcomes), WORRIED (reported concern), MODELLED EXPOSURE, BEHAVIOR and SOLUTION PERFORMANCE separate.
- For each material claim include a source ledger row: claim_id, claim, publisher, exact_title, publication_date (or UNKNOWN), canonical_url, geography, population, evidence_tier (T1/T2/T3/T4/UNKNOWN), evidence_class, measure_and_denominator, period, limitations, verification_status.
- Give counterevidence, alternative explanations, source dependencies/shared-cause flags, limitations and explicit searched-but-unresolved gaps.
- A trajectory requires comparable historical measures. Otherwise mark UNKNOWN.
- Do not assess commercial opportunity or recommend a product in this research stage.
- Do not use a composite score or rank candidates unless explicitly requested and a method is supplied.
- The final human reviewer—not the model—selects which candidate proceeds.`;
    const userPrompt = `Run a bounded first-pass World Concern Radar scan using these approved intake parameters:
TITLE: ${payload.title}
RESEARCH QUESTION: ${payload.research_question}
GEOGRAPHY: ${payload.geography}
POPULATION: ${payload.population}
TIME WINDOW: ${payload.time_window}
EVIDENCE CUTOFF: ${payload.evidence_cutoff}

Return this JSON shape:
{
 "research_brief": {"question":"", "scope":"", "method":"", "sources_searched":[], "tools_used":["OpenAI Responses API web search"], "tools_not_used":[], "limitations":[]},
 "candidates":[{"id":"C01","problem_statement":"","population":"","context":"","geography":"","experienced_evidence_summary":"","worried_evidence_summary":"","modelled_exposure_summary":"","behavior_summary":"","trajectory_status":"UNKNOWN","counterevidence":[],"alternative_explanations":[],"shared_cause_flag":"UNKNOWN","unresolved_questions":[],"source_ids":[]}],
 "source_ledger":[{"id":"S01","publisher":"","exact_title":"","publication_date":"UNKNOWN","canonical_url":"","geography":"","population":"","evidence_tier":"UNKNOWN","evidence_class":"UNKNOWN","measure_and_denominator":"UNKNOWN","period":"UNKNOWN","limitations":"","verification_status":"unverified"}],
 "claim_ledger":[{"id":"CL01","claim":"","source_ids":[],"evidence_class":"UNKNOWN","status":"UNKNOWN","limitations":""}],
 "review_gate":{"question":"Which candidate IDs should be investigated more deeply?","allowed_actions":["select_one_or_more","select_all","request_more_evidence","revise_scope","pause","stop"],"automatic_approval":false},
 "status":"complete_with_limitations"
}
Keep source_ids consistent. If no credible source can be verified, return an empty candidates list or clearly limited candidates, not fabricated entries. The candidate pool is provisional; do not invent user-supplied controls or claim this is a comprehensive global scan.`;

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_RESEARCH_MODEL") || "gpt-4.1",
          tools: [{ type: "web_search" }],
          input: [{ role: "system", content: [{ type: "input_text", text: systemPrompt }] }, { role: "user", content: [{ type: "input_text", text: userPrompt }] }],
          text: { format: { type: "json_object" } },
        }),
      });
      const apiBody = await response.json();
      if (!response.ok) throw new Error(`Research provider returned HTTP ${response.status}: ${String(apiBody?.error?.message || "request failed").slice(0, 400)}`);
      const textOutput = (apiBody.output ?? []).flatMap((item: any) => item.type === "message" ? (item.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text) : []).join("\n");
      if (!textOutput) throw new Error("Research provider returned no structured output.");
      let result: any;
      try { result = JSON.parse(textOutput); } catch { throw new Error("Research provider output was not valid JSON."); }
      const status = result.status === "complete" ? "complete" : "complete_with_limitations";
      const { data: updated, error: updateError } = await db.from("research_jobs").update({ status, result, model: Deno.env.get("OPENAI_RESEARCH_MODEL") || "gpt-4.1", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", job.id).eq("user_id", user.id).select("*").single();
      if (updateError || !updated) throw new Error("Research finished but saving the result failed.");
      return reply({ job: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown research error";
      await db.from("research_jobs").update({ status: "failed", error_summary: message.slice(0, 1000), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", job.id).eq("user_id", user.id);
      return reply({ job_id: job.id, status: "failed", error: message, next_step: "Check the OpenAI API key, provider permissions and Supabase function logs." }, 502);
    }
  }
  if (route[0] === "jobs" && route.length === 2 && req.method === "GET") {
    const { data, error } = await db.from("research_jobs").select("*").eq("id", route[1]).eq("user_id", user.id).maybeSingle();
    if (error) return reply({ error: "Could not load research job." }, 500);
    if (!data) return reply({ error: "Research job not found." }, 404);
    return reply({ job: data });
  }
  return reply({ error: "Route not found", routes: ["GET /health", "GET /jobs", "POST /jobs", "GET /jobs/:id"] }, 404);
});
