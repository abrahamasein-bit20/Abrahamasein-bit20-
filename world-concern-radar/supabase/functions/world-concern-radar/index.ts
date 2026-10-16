import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const fail = (message: string, status = 400) => json({ error: message }, status);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textField(body: Record<string, unknown>, key: string, required = false, max = 5000) {
  const value = body[key];
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`'${key}' is required`);
    return null;
  }
  if (typeof value !== "string" || value.length > max) {
    throw new Error(`'${key}' must be a string of at most ${max} characters`);
  }
  return value.trim();
}

function listField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100 || !value.every((v) => typeof v === "string")) {
    throw new Error(`'${key}' must be an array of at most 100 strings`);
  }
  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST", "PATCH"].includes(req.method)) return fail("Method not allowed", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail("Server configuration is incomplete; required Supabase environment variables are missing.", 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return fail("A valid bearer token is required.", 401);

  const verifier = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await verifier.auth.getUser();
  if (authError || !authData.user) return fail("Authentication failed.", 401);
  const userId = authData.user.id;

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const url = new URL(req.url);
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const functionIndex = parts.lastIndexOf("world-concern-radar");
  const route = functionIndex >= 0 ? parts.slice(functionIndex + 1) : parts.slice(-1);
  const collection = route[0] ?? "";
  const runId = route[1] ?? "";
  const subresource = route[2] ?? "";

  async function getOwnedRun(id: string) {
    const { data, error } = await db.from("radar_runs").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function audit(run_id: string, event_type: string, entity_type: string | null, entity_id: string | null, details: Record<string, unknown> = {}) {
    const { error } = await db.from("radar_audit_events").insert({
      run_id, user_id: userId, event_type, entity_type, entity_id, details,
    });
    if (error) throw new Error(`Audit write failed: ${error.message}`);
  }

  try {
    if (collection === "health" && req.method === "GET") {
      return json({ service: "world-concern-radar", status: "ok", version: "1.0.1", authenticated: true });
    }

    if (collection === "runs" && !runId && req.method === "GET") {
      const rawLimit = Number(url.searchParams.get("limit") ?? "20");
      const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 20;
      const { data, error } = await db.from("radar_runs").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(limit);
      if (error) return fail(error.message, 500);
      return json({ data });
    }

    if (collection === "runs" && !runId && req.method === "POST") {
      const body = await req.json();
      if (!isObject(body)) return fail("Request body must be a JSON object.");
      const title = textField(body, "title", true, 240);
      const objective = textField(body, "objective", true, 5000);
      const status = textField(body, "status") ?? "in_progress";
      const allowed = ["not_started", "in_progress", "blocked", "complete", "complete_with_limitations"];
      if (!allowed.includes(status)) return fail("Invalid run status.");
      const record = {
        user_id: userId, title, objective,
        geography: textField(body, "geography", false, 500),
        population: textField(body, "population", false, 1000),
        time_window: textField(body, "time_window", false, 500),
        evidence_cutoff: textField(body, "evidence_cutoff", false, 10),
        status, methodology_version: textField(body, "methodology_version", false, 100) ?? "v1",
        manifest: isObject(body.manifest) ? body.manifest : {},
        limitations: Array.isArray(body.limitations) ? body.limitations : [],
      };
      const { data, error } = await db.from("radar_runs").insert(record).select("*").single();
      if (error) return fail(error.message, 400);
      await audit(data.id, "run.created", "run", data.id, { methodology_version: data.methodology_version });
      return json({ data }, 201);
    }

    if (collection !== "runs" || !runId) return fail("Route not found.", 404);
    const run = await getOwnedRun(runId);
    if (!run) return fail("Run not found.", 404);

    if (!subresource && req.method === "GET") return json({ data: run });

    if (!subresource && req.method === "PATCH") {
      const body = await req.json();
      if (!isObject(body)) return fail("Request body must be a JSON object.");
      const patch: Record<string, unknown> = {};
      for (const field of ["title", "objective", "geography", "population", "time_window", "evidence_cutoff", "methodology_version"] as const) {
        if (field in body) patch[field] = textField(body, field, field === "title" || field === "objective", field === "title" ? 240 : 5000);
      }
      if ("status" in body) {
        const status = textField(body, "status", true, 40);
        if (!["not_started", "in_progress", "blocked", "complete", "complete_with_limitations"].includes(status!)) return fail("Invalid run status.");
        patch.status = status;
      }
      if (isObject(body.manifest)) patch.manifest = body.manifest;
      if (Array.isArray(body.limitations)) patch.limitations = body.limitations;
      patch.updated_at = new Date().toISOString();
      const { data, error } = await db.from("radar_runs").update(patch).eq("id", runId).eq("user_id", userId).select("*").single();
      if (error) return fail(error.message, 400);
      await audit(runId, "run.updated", "run", runId, { fields: Object.keys(patch) });
      return json({ data });
    }

    if (req.method === "GET" && subresource === "ledger") {
      const [claims, sources, signals, events] = await Promise.all([
        db.from("radar_claims").select("*").eq("run_id", runId).eq("user_id", userId).order("created_at"),
        db.from("radar_sources").select("*").eq("run_id", runId).eq("user_id", userId).order("created_at"),
        db.from("radar_signal_observations").select("*").eq("run_id", runId).eq("user_id", userId).order("created_at"),
        db.from("radar_audit_events").select("*").eq("run_id", runId).eq("user_id", userId).order("created_at"),
      ]);
      const errors = [claims.error, sources.error, signals.error, events.error].filter(Boolean);
      if (errors.length) return fail(errors.map((e) => e!.message).join("; "), 500);
      return json({ run, claims: claims.data, sources: sources.data, signals: signals.data, audit_events: events.data });
    }

    if (req.method === "POST" && ["claims", "sources", "signals"].includes(subresource)) {
      const body = await req.json();
      if (!isObject(body)) return fail("Request body must be a JSON object.");
      let table: string;
      let record: Record<string, unknown>;
      if (subresource === "claims") {
        const claim = textField(body, "claim", true, 5000);
        const evidenceClass = textField(body, "evidence_class") ?? "unknown";
        const status = textField(body, "status") ?? "unknown";
        const confidence = textField(body, "confidence") ?? "unassessed";
        if (!["experienced","worried","modelled_exposure","behavior","solution_performance","trajectory","source_quality","inference","unknown"].includes(evidenceClass)) return fail("Invalid evidence_class.");
        if (!["verified","partially_verified","unverified","contradicted","unknown","insufficient_evidence"].includes(status)) return fail("Invalid claim status.");
        if (!["high","moderate","low","unassessed"].includes(confidence)) return fail("Invalid confidence.");
        table = "radar_claims";
        record = {
          run_id: runId, user_id: userId, claim,
          claim_key: textField(body, "claim_key", false, 120),
          evidence_class: evidenceClass, status, confidence,
          geography: textField(body, "geography", false, 500),
          population: textField(body, "population", false, 1000),
          period_start: textField(body, "period_start", false, 10),
          period_end: textField(body, "period_end", false, 10),
          measure: textField(body, "measure", false, 1000),
          denominator: textField(body, "denominator", false, 1000),
          value_numeric: typeof body.value_numeric === "number" ? body.value_numeric : null,
          unit: textField(body, "unit", false, 100),
          support_summary: textField(body, "support_summary", false, 5000),
          limitations: textField(body, "limitations", false, 5000),
          alternative_explanations: listField(body, "alternative_explanations"),
          falsification_condition: textField(body, "falsification_condition", false, 2000),
          source_ids: listField(body, "source_ids"),
        };
      } else if (subresource === "sources") {
        table = "radar_sources";
        record = {
          run_id: runId, user_id: userId,
          canonical_url: textField(body, "canonical_url", false, 3000),
          title: textField(body, "title", true, 1000),
          publisher: textField(body, "publisher", false, 500),
          publication_date: textField(body, "publication_date", false, 10),
          geography: textField(body, "geography", false, 500),
          population: textField(body, "population", false, 1000),
          source_type: textField(body, "source_type") ?? "unknown",
          verification_status: textField(body, "verification_status") ?? "unverified",
          methodology: isObject(body.methodology) ? body.methodology : {},
          limitations: textField(body, "limitations", false, 5000),
        };
      } else {
        const signalType = textField(body, "signal_type", true, 50);
        if (!["experienced","worried","modelled_exposure","behavior","solution_performance","trajectory","source_quality"].includes(signalType!)) return fail("Invalid signal_type.");
        table = "radar_signal_observations";
        record = {
          run_id: runId, user_id: userId, signal_type: signalType,
          signal_name: textField(body, "signal_name", true, 500),
          observed_value: body.observed_value === undefined ? null : body.observed_value,
          unit: textField(body, "unit", false, 100),
          geography: textField(body, "geography", false, 500),
          population: textField(body, "population", false, 1000),
          period_start: textField(body, "period_start", false, 10),
          period_end: textField(body, "period_end", false, 10),
          denominator: textField(body, "denominator", false, 1000),
          source_ids: listField(body, "source_ids"),
          comparability: textField(body, "comparability") ?? "unknown",
          dependency_group: textField(body, "dependency_group", false, 200),
          missingness_reason: textField(body, "missingness_reason", false, 2000),
        };
      }
      const { data, error } = await db.from(table).insert(record).select("*").single();
      if (error) return fail(error.message, 400);
      await audit(runId, `${subresource}.created`, subresource.slice(0, -1), data.id, {});
      return json({ data }, 201);
    }

    return fail("Route not found or method not allowed.", 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return fail(message, 400);
  }
});
