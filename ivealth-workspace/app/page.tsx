"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  Activity, ArrowRight, BookOpen, Check, CheckCircle2,
  ChevronRight, ClipboardCheck, FileJson, FlaskConical,
  FolderOpen, HeartPulse, LayoutDashboard, ListChecks, Menu, Plus,
  Search, ShieldAlert, Target, X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StageKey = "wellbeing_research" | "world_concern_radar" | "problem_validation" | "opportunity_validation" | "product_development";
type Concern = { id: string; title: string; population: string; geography: string; signal: string; evidence: string; alternative: string; selected: boolean; status: string };
type Decision = { stage: StageKey; decision: string; rationale: string; at: string; selectedIds: string[] };
type Run = { id: string; title: string; scope: string; population: string; geography: string; horizon: string; created: string; stage: StageKey; concerns: Concern[]; decisions: Decision[] };
type View = "Overview" | "Research runs" | "Wellbeing Research" | "World Concern Radar" | "Problem Validation" | "Opportunity Validation" | "Product Development" | "Evidence Library" | "Decision log";
const STORE = "ivealth_workspace_v1";

const stageList: { key: StageKey; number: string; title: View; short: string; gate: string; description: string }[] = [
  { key: "wellbeing_research", number: "00", title: "Wellbeing Research", short: "Define the scope", gate: "Approve scope", description: "Set the wellbeing question, populations, geography and evidence boundaries." },
  { key: "world_concern_radar", number: "01", title: "World Concern Radar", short: "Detect concerns", gate: "Select problem IDs", description: "Build an evidence-led candidate register and select what deserves deeper investigation." },
  { key: "problem_validation", number: "02", title: "Problem Validation", short: "Test the problem", gate: "Approve dossier", description: "Establish magnitude, severity, trajectory, counterevidence and unresolved need." },
  { key: "opportunity_validation", number: "03", title: "Opportunity Validation", short: "Test the opportunity", gate: "Approve opportunity", description: "Evaluate possible responses separately from whether the human problem exists." },
  { key: "product_development", number: "04", title: "Product Development", short: "Design an experiment", gate: "Approve experiment", description: "Translate an approved opportunity into a testable product hypothesis." }
];

const mainNav: { label: View; icon: LucideIcon }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Research runs", icon: FolderOpen },
  { label: "Evidence Library", icon: BookOpen },
  { label: "Decision log", icon: ClipboardCheck }
];
const stageFor = (key: StageKey) => stageList.find(s => s.key === key)!;
const emptyRun = (): Run => ({ id: crypto.randomUUID(), title: "", scope: "", population: "", geography: "Global", horizon: "Past 5 years, with historical baseline where available", created: new Date().toISOString(), stage: "wellbeing_research", concerns: [], decisions: [] });
const nextStage = (key: StageKey) => stageList[Math.min(stageList.findIndex(s => s.key === key) + 1, stageList.length - 1)].key;
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export default function Home() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [view, setView] = useState<View>("Overview");
  const [loaded, setLoaded] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Run | null>(null);
  const [draftStep, setDraftStep] = useState(1);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [candidate, setCandidate] = useState({ title: "", population: "", geography: "Global", signal: "", evidence: "", alternative: "" });
  const [decision, setDecision] = useState("approved");
  const [rationale, setRationale] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"info" | "success" | "error">("info");
  const [filter, setFilter] = useState("");
  const [exportText, setExportText] = useState("");
  const [mobileMore, setMobileMore] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw) as Run[];
        if (Array.isArray(parsed)) { setRuns(parsed); if (parsed[0]) setActiveRunId(parsed[0].id); }
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(STORE, JSON.stringify(runs)); } catch {} } }, [runs, loaded]);

  const activeRun = runs.find(r => r.id === activeRunId) || null;
  const selected = activeRun?.concerns.filter(c => c.selected) || [];
  const activeStageIndex = activeRun ? stageList.findIndex(s => s.key === activeRun.stage) : 0;
  const stageHistory = activeRun?.decisions.slice().reverse() || [];
  const filteredRuns = useMemo(() => runs.filter(r => (r.title + " " + r.scope).toLowerCase().includes(filter.toLowerCase())), [runs, filter]);

  const updateRun = (fn: (run: Run) => Run) => {
    if (!activeRun) return;
    setRuns(prev => prev.map(r => r.id === activeRun.id ? fn(r) : r));
  };
  const announce = (message: string, type: "info" | "success" | "error" = "info") => { setNotice(message); setNoticeType(type); };
  const openCreate = () => { setDraft(emptyRun()); setDraftStep(1); setShowNew(true); };
  const createRun = () => {
    const r = draft || emptyRun();
    if (!r.title.trim() || r.title.trim().length > 240) { announce("Add a run name of 1–240 characters.", "error"); setDraftStep(1); return; }
    if (r.scope.trim().length < 10) { announce("Write a research question of at least 10 characters.", "error"); setDraftStep(1); return; }
    setRuns(prev => [r, ...prev]);
    setActiveRunId(r.id);
    setView("Wellbeing Research");
    setShowNew(false); setDraft(null);
    announce("Research run created in this browser. Next, review and approve the scope.", "success");
  };
  const addConcern = () => {
    if (!activeRun || !candidate.title.trim()) { announce("Enter a specific human problem statement first.", "error"); return; }
    const c: Concern = {
      id: "P-" + uid(), title: candidate.title.trim(), population: candidate.population.trim() || "Not specified",
      geography: candidate.geography, signal: candidate.signal.trim() || "Not classified",
      evidence: candidate.evidence.trim() || "UNKNOWN — evidence not yet entered",
      alternative: candidate.alternative.trim() || "Not yet assessed", selected: false, status: "Candidate"
    };
    updateRun(r => ({ ...r, concerns: [...r.concerns, c] }));
    setCandidate({ title: "", population: "", geography: "Global", signal: "", evidence: "", alternative: "" });
    setCandidateOpen(false);
    announce("Candidate added. It is not a validated finding.", "success");
  };
  const toggleConcern = (id: string) => updateRun(r => ({ ...r, concerns: r.concerns.map(c => c.id === id ? { ...c, selected: !c.selected } : c) }));
  const recordDecision = () => {
    if (!activeRun) { announce("Create or select a research run first.", "error"); return; }
    if (!rationale.trim()) { announce("Add a brief rationale so the decision can be understood later.", "error"); return; }
    if (activeRun.stage === "world_concern_radar" && decision === "selected_items" && selected.length === 0) { announce("Select at least one problem ID before advancing.", "error"); return; }
    if (activeRun.stage === "world_concern_radar" && decision === "approved") { announce("For the Radar, select problem IDs, request evidence, revise, or stop.", "error"); return; }
    if ((activeRun.stage === "problem_validation" || activeRun.stage === "opportunity_validation" || activeRun.stage === "product_development") && decision === "approved" && selected.length === 0) { announce("There are no selected problem IDs attached to this run. Return to the Radar and select items first.", "error"); return; }
    const d: Decision = { stage: activeRun.stage, decision, rationale: rationale.trim(), at: new Date().toISOString(), selectedIds: selected.map(c => c.id) };
    const advances = decision === "approved" || decision === "selected_items";
    updateRun(r => ({ ...r, decisions: [...r.decisions, d], stage: advances ? nextStage(r.stage) : r.stage }));
    setRationale("");
    if (advances) {
      const next = stageFor(nextStage(activeRun.stage)).title;
      setView(next);
      announce("Decision saved locally. You are now at " + next + ".", "success");
    } else {
      announce("Decision recorded locally. The run remains at this stage.", "success");
    }
  };
  const importPluginFile = async (file: File) => {
    setImportBusy(true);
    try {
      const raw = JSON.parse(await file.text());
      const root = raw?.run && typeof raw.run === "object" ? raw.run : raw;
      const candidateRows = Array.isArray(root.concerns) ? root.concerns : Array.isArray(root.candidates) ? root.candidates : Array.isArray(root.problems) ? root.problems : Array.isArray(root.items) ? root.items : [];
      const imported: Concern[] = candidateRows.map((item: any, index: number) => ({
        id: String(item.id || item.problem_id || item.claim_id || ("P-IMPORT-" + (index + 1))),
        title: String(item.title || item.problem_statement || item.problem || item.name || "Untitled candidate"),
        population: String(item.population || item.affected_population || item.context || "Not specified"),
        geography: String(item.geography || root.geography || "Unknown"),
        signal: String(item.signal || item.observed_signal || item.evidence_class || "Not classified"),
        evidence: typeof item.evidence === "string" ? item.evidence : typeof item.evidence_summary === "string" ? item.evidence_summary : Array.isArray(item.claims) ? JSON.stringify(item.claims) : item.source_ids ? "Source IDs: " + JSON.stringify(item.source_ids) : "UNKNOWN — source-level evidence details not supplied",
        alternative: String(item.counterevidence || item.alternative_explanation || item.alternative || "Not supplied"),
        selected: false, status: String(item.status || item.validation_status || "Imported — not independently verified")
      }));
      const looksLikeRun = Array.isArray(root.concerns) && Array.isArray(root.decisions) && root.stage;
      const run: Run = looksLikeRun ? { ...root, id: crypto.randomUUID(), created: new Date().toISOString() } : {
        id: crypto.randomUUID(), title: String(root.title || root.run_title || root.research_title || root.dossier_title || file.name.replace(/\.json$/i, "")),
        scope: String(root.scope || root.objective || root.research_question || root.brief || "Imported Radar results — research question not supplied"),
        population: String(root.population || root.target_population || "Not specified"), geography: String(root.geography || "Global"),
        horizon: String(root.horizon || root.time_window || root.period || "Not specified"), created: new Date().toISOString(),
        stage: "world_concern_radar", concerns: imported, decisions: []
      };
      if (!run.concerns) run.concerns = imported;
      if (!run.title.trim()) run.title = "Imported Radar results";
      if (!run.scope.trim()) run.scope = "Imported results — research question not supplied";
      setRuns(prev => [run, ...prev]); setActiveRunId(run.id); setView("World Concern Radar");
      announce("Imported " + run.concerns.length + " candidates. Verify sources before approving anything.", "success");
    } catch { announce("The file could not be imported. Choose a valid Radar JSON export; no data was imported.", "error"); }
    finally { setImportBusy(false); }
  };
  const exportRun = () => {
    if (!activeRun) return;
    const blob = new Blob([JSON.stringify(activeRun, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = (activeRun.title || "ivealth-research").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
    a.click(); URL.revokeObjectURL(url);
  };

  const goto = (v: View) => { setView(v); setMobileMore(false); setNotice(""); };
  const startOrResume = () => { if (!activeRun) openCreate(); else goto(stageFor(activeRun.stage).title); };

  return <div className="app-shell">
    <aside className="side-rail">
      <div className="brand-lockup"><div className="brand-mark">i</div><div><div className="brand-name">iValth</div><div className="brand-sub">RESEARCH STUDIO</div></div></div>
      <div className="rail-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        {mainNav.slice(0, 2).map(item => <NavButton key={item.label} item={item} active={view === item.label} onClick={() => goto(item.label)} />)}
      </nav>
      <div className="rail-label rail-label-spaced">RESEARCH WORKFLOW</div>
      <nav className="workflow-nav" aria-label="Research workflow">{stageList.map((s, i) => {
        const Icon = [HeartPulse, Activity, ListChecks, Target, FlaskConical][i];
        const state = activeRun ? (i < activeStageIndex ? "complete" : i === activeStageIndex ? "current" : "locked") : (i === 0 ? "current" : "locked");
        return <button key={s.key} className={"workflow-nav-item " + (view === s.title ? "active " : "") + state} onClick={() => goto(s.title)}><span className="nav-stage-icon">{state === "complete" ? <Check size={15}/> : <Icon size={16}/>}</span><span className="workflow-nav-copy"><span>{s.title}</span><small>Stage {s.number}</small></span>{state === "current" && <span className="current-indicator"/>}</button>;
      })}</nav>
      <div className="rail-bottom">
        <div className="rail-bottom-title"><ShieldAlert size={15}/> Prototype mode</div>
        <p>Records stay in this browser. Authentication and shared database sync are not enabled.</p>
        <div className="rail-storage"><span/> Browser storage active</div>
      </div>
    </aside>

    <div className="mobile-header"><button className="mobile-brand" onClick={() => goto("Overview")}><span className="brand-mark">i</span><span><strong>iValth</strong><small>Research Studio</small></span></button><span className="prototype-pill">Prototype</span></div>

    <main className="main-content">
      <header className="page-toolbar">
        <div className="breadcrumbs"><span>iValth</span><ChevronRight size={14}/><strong>{view}</strong></div>
        <div className="toolbar-actions">
          {activeRun && <button className="subtle-button" onClick={exportRun}><FileJson size={15}/> Export run</button>}
          <button className="primary-button" onClick={openCreate}><Plus size={17}/> <span>New research run</span></button>
        </div>
      </header>

      {notice && <div className={"feedback feedback-" + noticeType} role={noticeType === "error" ? "alert" : "status"}><span className="feedback-icon">{noticeType === "success" ? <CheckCircle2 size={17}/> : noticeType === "error" ? <ShieldAlert size={17}/> : <Activity size={17}/>}</span><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16}/></button></div>}

      {view === "Overview" && <OverviewView runs={runs} activeRun={activeRun} onCreate={openCreate} onOpen={r => {setActiveRunId(r.id); goto(stageFor(r.stage).title);}} onViewRuns={() => goto("Research runs")} onImport={e => {const f=e.target.files?.[0];if(f) void importPluginFile(f);e.target.value="";}} importBusy={importBusy} onContinue={startOrResume}/>}
      {view === "Research runs" && <RunsView runs={filteredRuns} query={filter} setQuery={setFilter} activeId={activeRunId} onOpen={r=>{setActiveRunId(r.id);goto(stageFor(r.stage).title);}} onCreate={openCreate}/>}
      {view === "Wellbeing Research" && <WellbeingView run={activeRun} decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={recordDecision} onCreate={openCreate}/>}
      {view === "World Concern Radar" && <RadarView run={activeRun} candidate={candidate} setCandidate={setCandidate} open={candidateOpen} setOpen={setCandidateOpen} onAdd={addConcern} selected={selected} onToggle={toggleConcern} decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={recordDecision} onCreate={openCreate}/>}
      {view === "Problem Validation" && <ValidationView run={activeRun} stage="problem_validation" decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={recordDecision} onCreate={openCreate}/>}
      {view === "Opportunity Validation" && <ValidationView run={activeRun} stage="opportunity_validation" decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={recordDecision} onCreate={openCreate}/>}
      {view === "Product Development" && <ValidationView run={activeRun} stage="product_development" decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={recordDecision} onCreate={openCreate}/>}
      {view === "Evidence Library" && <EvidenceView runs={runs}/>}
      {view === "Decision log" && <DecisionLog run={activeRun} runs={runs} onSelect={r=>setActiveRunId(r.id)}/>}

      {showNew && <div className="sheet-backdrop"><section className="create-sheet" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <div className="sheet-handle"/><div className="sheet-heading"><div><div className="eyebrow">NEW WORKSPACE ITEM</div><h2 id="create-title">Start a research run</h2><p>Define the question first. No scan starts automatically.</p></div><button className="icon-button" onClick={()=>{setShowNew(false);setDraft(null);}} aria-label="Close"><X size={19}/></button></div>
        <div className="wizard-progress"><span className={draftStep===1?"active":""}>1 <small>Research question</small></span><i/><span className={draftStep===2?"active":""}>2 <small>Scope and context</small></span></div>
        {draft && draftStep===1 && <div className="form-stack"><Field label="Run name" hint="A short name you'll recognise later"><input autoFocus value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Young adult social connection" maxLength={240}/></Field><Field label="Research question" hint="Describe what you want to understand about human wellbeing"><textarea value={draft.scope} onChange={e=>setDraft({...draft,scope:e.target.value})} rows={4} placeholder="Which human concerns are emerging or worsening, for whom, and what evidence supports this?"/></Field></div>}
        {draft && draftStep===2 && <div className="form-stack"><Field label="Population" hint="Who is in scope? Be specific where possible"><input value={draft.population} onChange={e=>setDraft({...draft,population:e.target.value})} placeholder="e.g. young adults ages 18–29"/></Field><Field label="Geography"><select value={draft.geography} onChange={e=>setDraft({...draft,geography:e.target.value})}><option>Global</option><option>Regional</option><option>Country-specific</option><option>Local</option></select></Field><Field label="Time horizon"><input value={draft.horizon} onChange={e=>setDraft({...draft,horizon:e.target.value})}/></Field><div className="review-summary"><span>RESEARCH QUESTION</span><strong>{draft.scope}</strong><span>WELLBEING SCOPE</span><p>Evidence and trajectory must be assessed against this population, geography and period. Missing data remains UNKNOWN.</p></div></div>}
        <div className="sheet-footer">{draftStep===2 ? <button className="secondary-button" onClick={()=>setDraftStep(1)}>Back</button> : <button className="secondary-button" onClick={()=>{setShowNew(false);setDraft(null);}}>Cancel</button>}{draftStep===1 ? <button className="primary-button" onClick={()=>{if(!draft?.title.trim()||!draft?.scope.trim()){announce("Enter a run name and research question to continue.","error");return;}setNotice("");setDraftStep(2);}}>Continue <ArrowRight size={16}/></button> : <button className="primary-button" onClick={createRun}>Create research run <ArrowRight size={16}/></button>}</div>
      </section></div>}
    </main>

    <nav className="mobile-tabbar" aria-label="Primary navigation">
      {[{label:"Overview" as View, short:"Home", icon:LayoutDashboard},{label:"Research runs" as View, short:"Runs", icon:FolderOpen},{label:activeRun ? stageFor(activeRun.stage).title : "Wellbeing Research" as View, short:"Current", icon:Activity},{label:"Decision log" as View, short:"Decisions", icon:ClipboardCheck}].map(item=>{const Icon=item.icon;return <button key={item.short} className={view===item.label?"selected":""} onClick={()=>goto(item.label)}><Icon size={19}/><small>{item.short}</small></button>;})}
      <button className={mobileMore?"selected":""} onClick={()=>setMobileMore(v=>!v)}><Menu size={19}/><small>More</small></button>
    </nav>
    {mobileMore && <div className="mobile-more-menu">{stageList.map(s=><button key={s.key} onClick={()=>goto(s.title)}><span>{s.number}</span>{s.title}</button>)}<button onClick={()=>goto("Evidence Library")}><BookOpen size={16}/> Evidence Library</button></div>}
  </div>;
}

function Field({label,hint,children}:{label:string;hint?:string;children:ReactNode}) {
 return <label className="form-field"><span className="field-label">{label}</span>{hint&&<span className="field-hint">{hint}</span>}{children}</label>;
}
function NavButton({item,active,onClick}:{item:{label:View;icon:LucideIcon};active:boolean;onClick:()=>void}) {
 const Icon=item.icon;return <button className={"primary-nav-item "+(active?"active":"")} onClick={onClick}><Icon size={17}/><span>{item.label}</span>{active&&<span className="nav-active-mark"/>}</button>;
}
function PageIntro({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}) {
 return <div className="page-intro"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{action&&<div className="intro-action">{action}</div>}</div>;
}
function StageProgress({stage}:{stage:StageKey}) {
 const idx=stageList.findIndex(s=>s.key===stage);
 return <div className="stage-progress" aria-label={"Current stage "+(idx+1)+" of 5"}>{stageList.map((s,i)=><div key={s.key} className={"stage-progress-step "+(i<idx?"complete ":i===idx?"current":"")}><span className="progress-node">{i<idx?<Check size={13}/>:s.number}</span><span className="progress-caption">{s.short}</span></div>)}</div>;
}
function OverviewView({runs,activeRun,onCreate,onOpen,onViewRuns,onImport,importBusy,onContinue}:{runs:Run[];activeRun:Run|null;onCreate:()=>void;onOpen:(r:Run)=>void;onViewRuns:()=>void;onImport:(e:ChangeEvent<HTMLInputElement>)=>void;importBusy:boolean;onContinue:()=>void}) {
 const countCandidates=runs.reduce((n,r)=>n+r.concerns.length,0);
 const countDecisions=runs.reduce((n,r)=>n+r.decisions.length,0);
 return <div className="view-stack">
  <PageIntro eyebrow="RESEARCH OPERATIONS" title="Research overview" description="A clear view of your wellbeing research, the evidence collected, and the next decision awaiting review." action={<button className="primary-button" onClick={onCreate}><Plus size={17}/> New research run</button>}/>
  <section className="welcome-panel"><div className="welcome-copy"><span className="eyebrow light">THE IVALTH RESEARCH METHOD</span><h2>{activeRun ? "Continue the work that matters." : "Start with a human question."}</h2><p>{activeRun ? activeRun.scope : "Define a wellbeing question, examine the evidence, then decide which problem deserves deeper validation. The system won't choose for you."}</p><div className="welcome-actions"><button className="light-primary-button" onClick={activeRun?onContinue:onCreate}>{activeRun?"Continue current run":"Create research run"} <ArrowRight size={16}/></button>{activeRun&&<span className="welcome-stage">{stageFor(activeRun.stage).number} / 04 · {stageFor(activeRun.stage).title}</span>}</div></div><div className="welcome-graphic" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><Target size={27}/></div><span className="orbit-dot dot-a"/><span className="orbit-dot dot-b"/><span className="orbit-dot dot-c"/></div></section>
  <div className="summary-strip"><div className="summary-item"><span>Research runs</span><strong>{runs.length}</strong><small>{runs.length===1?"1 current workstream":"Across your local workspace"}</small></div><div className="summary-item"><span>Candidate problems</span><strong>{countCandidates}</strong><small>Not necessarily validated</small></div><div className="summary-item"><span>Human decisions</span><strong>{countDecisions}</strong><small>Saved in this browser</small></div><div className="summary-item summary-status"><span>Data storage</span><strong><span className="status-dot"/>Local only</strong><small>Not yet synced across devices</small></div></div>
  <div className="section-heading-row"><div><h2>Research workflow</h2><p>Each stage ends with an explicit human decision.</p></div></div>
  <div className="workflow-overview">{stageList.map((s,i)=>{const Icon=[HeartPulse,Activity,ListChecks,Target,FlaskConical][i];const done=activeRun&&i<stageList.findIndex(x=>x.key===activeRun.stage);const current=activeRun?activeRun.stage===s.key:i===0;return <div className={"workflow-overview-item "+(current?"is-current ":"")+(done?"is-done":"")} key={s.key}><div className="overview-stage-top"><span className="overview-stage-number">STAGE {s.number}</span><span className="overview-stage-state">{done?<Check size={13}/>:current?"Current": "Next"}</span></div><div className="overview-stage-icon"><Icon size={18}/></div><h3>{s.title}</h3><p>{s.description}</p><div className="overview-gate"><span>Human gate</span><strong>{s.gate}</strong></div></div>;})}</div>
  <div className="content-columns"><section className="surface-panel"><div className="panel-heading"><div><h2>Recent research runs</h2><p>Pick up where you left off.</p></div><button className="text-button" onClick={onViewRuns}>View all <ArrowRight size={15}/></button></div>{runs.length===0?<EmptyState icon={<FolderOpen size={22}/>} title="No research runs yet" description="Create a run to define the question, population and time horizon before starting detection." action={<button className="primary-button" onClick={onCreate}><Plus size={16}/> Create first run</button>}/>:<div className="run-list">{runs.slice(0,4).map(r=><RunRow key={r.id} run={r} active={r.id===activeRun?.id} onOpen={()=>onOpen(r)}/>)}</div>}</section>
   <section className="surface-panel"><div className="panel-heading"><div><h2>Bring in Radar findings</h2><p>Transfer structured output from the ChatGPT plugin.</p></div><span className="mini-icon"><FileJson size={17}/></span></div><div className="import-panel"><p>Import a Radar JSON export to create a candidate register. Imported claims remain unverified until reviewed.</p><label className="secondary-button upload-button">{importBusy?"Importing…":"Choose JSON file"}<input type="file" accept="application/json,.json" disabled={importBusy} onChange={onImport} hidden/></label><div className="muted-note">JSON only · Missing evidence stays UNKNOWN</div></div><div className="principle-list"><div><CheckCircle2 size={16}/><span>Claims stay traceable to source records</span></div><div><CheckCircle2 size={16}/><span>Concern and experienced harm stay distinct</span></div><div><CheckCircle2 size={16}/><span>Only human-selected problems advance</span></div></div></section></div>
  <div className="local-data-note"><ShieldAlert size={15}/><span><strong>Prototype data storage.</strong> Runs and decisions are saved in this browser only. Authentication and shared Supabase persistence are not enabled; don't enter confidential data.</span></div>
 </div>;
}
function RunRow({run,active,onOpen}:{run:Run;active:boolean;onOpen:()=>void}) {
 const stage=stageFor(run.stage);const idx=stageList.findIndex(s=>s.key===run.stage);
 return <button className={"run-row "+(active?"run-row-active":"")} onClick={onOpen}><span className="run-row-mark"><FolderOpen size={17}/></span><span className="run-row-content"><strong>{run.title}</strong><small>{run.scope}</small><span className="run-row-meta"><span className="stage-chip">{stage.number} · {stage.title}</span><span>{run.concerns.length} problem{run.concerns.length===1?"":"s"}</span></span><span className="run-progress"><i style={{width:((idx+1)/5*100)+"%"}}/></span></span><ChevronRight size={17} className="run-row-chevron"/></button>;
}
function EmptyState({icon,title,description,action}:{icon:ReactNode;title:string;description:string;action?:ReactNode}) {
 return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function RunsView({runs,query,setQuery,activeId,onOpen,onCreate}:{runs:Run[];query:string;setQuery:(s:string)=>void;activeId:string;onOpen:(r:Run)=>void;onCreate:()=>void}) {
 return <div className="view-stack"><PageIntro eyebrow="WORKSPACE" title="Research runs" description="Each run has its own scope, candidate pool and human decisions." action={<button className="primary-button" onClick={onCreate}><Plus size={17}/> New run</button>}/><section className="surface-panel"><div className="run-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by run name or question" aria-label="Search research runs"/></div>{runs.length===0?<EmptyState icon={<Search size={22}/>} title="No matching runs" description={query?"Try a different search term.":"Create a research run to get started."} action={!query?<button className="primary-button" onClick={onCreate}><Plus size={16}/> New research run</button>:undefined}/>:<div className="run-list">{runs.map(r=><RunRow key={r.id} run={r} active={r.id===activeId} onOpen={()=>onOpen(r)}/>)}</div>}</section></div>;
}
function StageGate({stage,decision,setDecision,rationale,setRationale,onDecision,options,selectedCount=0}:{stage:StageKey;decision:string;setDecision:(s:string)=>void;rationale:string;setRationale:(s:string)=>void;onDecision:()=>void;options:{value:string;label:string;help:string}[];selectedCount?:number}) {
 return <section className="gate-panel"><div className="gate-panel-heading"><div><span className="gate-eyebrow"><ClipboardCheck size={15}/> HUMAN REVIEW REQUIRED</span><h2>Review and decide</h2><p>This decision is yours. The system will not automatically select a problem or approve a stage.</p></div><span className="gate-number">{stageFor(stage).number}</span></div><div className="gate-options">{options.map(o=><label key={o.value} className={"gate-option "+(decision===o.value?"option-selected":"")}><input type="radio" name={"decision-"+stage} value={o.value} checked={decision===o.value} onChange={()=>setDecision(o.value)}/><span className="gate-option-copy"><strong>{o.label}</strong><small>{o.help}</small></span>{decision===o.value&&<CheckCircle2 size={17} className="option-check"/>}</label>)}</div><Field label="Decision rationale" hint="Record why this is the right next step. Required to save the decision."><textarea rows={3} value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Evidence considered, uncertainties, and why you chose this action…"/></Field>{stage==="world_concern_radar"&&<div className="selection-summary">{selectedCount} problem{selectedCount===1?"":"s"} selected for deeper research</div>}<button className="primary-button gate-submit" onClick={onDecision}>Record decision <ArrowRight size={16}/></button><p className="gate-footnote">Saved locally in this browser · Not yet server-enforced</p></section>;
}
function WellbeingView({run,decision,setDecision,rationale,setRationale,onDecision,onCreate}:{run:Run|null;decision:string;setDecision:(s:string)=>void;rationale:string;setRationale:(s:string)=>void;onDecision:()=>void;onCreate:()=>void}) {
 if(!run)return <MissingRun title="Define the wellbeing scope" description="A research run establishes the question and the boundaries before any concerns are detected." onCreate={onCreate}/>;
 const isCurrent=run.stage==="wellbeing_research";
 return <StagePage stage="wellbeing_research" run={run} lead="Set the boundaries before detection" intro="The scope determines what the Radar should look for, which populations it should consider, and what evidence can support a conclusion."><div className="detail-grid"><Detail label="Research question" value={run.scope}/><Detail label="Population" value={run.population||"Not specified"}/><Detail label="Geography" value={run.geography}/><Detail label="Time horizon" value={run.horizon}/></div><div className="research-note"><HeartPulse size={18}/><div><strong>Scope check</strong><p>Confirm the wellbeing constructs, populations, contexts, time horizon, exclusions and evidence boundaries. Do not start detection until this scope is approved.</p></div></div>{isCurrent?<StageGate stage="wellbeing_research" decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={onDecision} options={[{value:"approved",label:"Approve scope",help:"Scope is clear enough to begin detection."},{value:"revise",label:"Request revision",help:"Change the research question or scope first."},{value:"stop",label:"Stop this run",help:"Do not continue this research run."}]}/>:<DecisionHistory items={run.decisions.filter(d=>d.stage==="wellbeing_research")}/>}</StagePage>;
}
function StagePage({stage,run,lead,intro,children}:{stage:StageKey;run:Run;lead:string;intro:string;children:ReactNode}) {
 return <div className="view-stack"><PageIntro eyebrow={"STAGE "+stageFor(stage).number+" / 04"} title={stageFor(stage).title} description={intro}/><StageProgress stage={stage}/><div className="run-context"><span className="run-context-icon"><FolderOpen size={17}/></span><span><small>ACTIVE RESEARCH RUN</small><strong>{run.title}</strong></span><span className="run-context-right">{run.concerns.length} candidate{run.concerns.length===1?"":"s"}</span></div><div className="stage-lead"><div><span className="stage-lead-kicker">CURRENT TASK</span><h2>{lead}</h2></div><p>{stageFor(stage).description}</p></div>{children}</div>;
}
function RadarView({run,candidate,setCandidate,open,setOpen,onAdd,selected,onToggle,decision,setDecision,rationale,setRationale,onDecision,onCreate}:{run:Run|null;candidate:{title:string;population:string;geography:string;signal:string;evidence:string;alternative:string};setCandidate:(v:{title:string;population:string;geography:string;signal:string;evidence:string;alternative:string})=>void;open:boolean;setOpen:(v:boolean)=>void;onAdd:()=>void;selected:Concern[];onToggle:(id:string)=>void;decision:string;setDecision:(s:string)=>void;rationale:string;setRationale:(s:string)=>void;onDecision:()=>void;onCreate:()=>void}) {
 if(!run)return <MissingRun title="Start with an approved scope" description="The Radar should work from a defined wellbeing question, population and time horizon." onCreate={onCreate}/>;
 const isCurrent=run.stage==="world_concern_radar";
 return <StagePage stage="world_concern_radar" run={run} lead="Build and review the candidate pool" intro="Keep problem statements specific, record what the evidence does and does not show, then choose which IDs deserve deeper validation."><div className="candidate-toolbar"><div><strong>{run.concerns.length} candidates</strong><span>{selected.length} selected for Problem Validation</span></div><button className="secondary-button" onClick={()=>setOpen(!open)}>{open?<X size={16}/>:<Plus size={16}/>} {open?"Close form":"Add candidate"}</button></div>{open&&<section className="surface-panel candidate-form"><div className="panel-heading"><div><h2>Candidate problem</h2><p>State the human problem, not a proposed product.</p></div></div><div className="form-stack"><Field label="Problem statement *" hint="Who is affected, in what situation, and what harm or constraint do they experience?"><textarea rows={3} value={candidate.title} onChange={e=>setCandidate({...candidate,title:e.target.value})} placeholder="Describe the specific human problem…"/></Field><div className="field-grid"><Field label="Affected population"><input value={candidate.population} onChange={e=>setCandidate({...candidate,population:e.target.value})} placeholder="Population or subgroup"/></Field><Field label="Geography"><select value={candidate.geography} onChange={e=>setCandidate({...candidate,geography:e.target.value})}><option>Global</option><option>Regional</option><option>Country-specific</option><option>Local</option></select></Field><Field label="Observed signal"><select value={candidate.signal} onChange={e=>setCandidate({...candidate,signal:e.target.value})}><option value="">Not classified</option><option>EXPERIENCED</option><option>WORRIED</option><option>MODELLED EXPOSURE</option><option>BEHAVIOR</option><option>TRAJECTORY</option><option>SOLUTION PERFORMANCE</option></select></Field></div><Field label="Evidence / source details" hint="Publisher, title, date, canonical URL, population, measure and limitations."><textarea rows={3} value={candidate.evidence} onChange={e=>setCandidate({...candidate,evidence:e.target.value})} placeholder="Source details, observed result, denominator and limitations. Use UNKNOWN when unestablished."/></Field><Field label="Counterevidence / alternative explanation"><textarea rows={2} value={candidate.alternative} onChange={e=>setCandidate({...candidate,alternative:e.target.value})} placeholder="What else could explain the signal? What evidence contradicts it?"/></Field></div><div className="form-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancel</button><button className="primary-button" onClick={onAdd}>Add candidate <Plus size={16}/></button></div></section>}
 <section className="candidate-section"><div className="section-heading-row"><div><h2>Candidate register</h2><p>Selection is the handoff; unselected items remain in this register.</p></div>{run.concerns.length>0&&<span className="quiet-count">{selected.length} selected</span>}</div>{run.concerns.length===0?<EmptyState icon={<Activity size={22}/>} title="Your candidate pool is empty" description="Add items from source-based research or import a Radar JSON export. Do not invent missing evidence." action={<button className="secondary-button" onClick={()=>setOpen(true)}><Plus size={16}/> Add first candidate</button>}/>:<div className="candidate-list">{run.concerns.map(c=><article key={c.id} className={"candidate-card "+(c.selected?"candidate-card-selected":"")}><label className="candidate-select"><input type="checkbox" checked={c.selected} onChange={()=>onToggle(c.id)} disabled={!isCurrent} aria-label={"Select "+c.id}/><span>{c.selected?"Selected for deeper research":"Select for Problem Validation"}</span></label><div className="candidate-title-row"><span className="candidate-id">{c.id}</span><h3>{c.title}</h3></div><div className="candidate-meta"><span>{c.population}</span><span>{c.geography}</span><span className="evidence-chip">{c.signal}</span></div><details className="evidence-details"><summary>Evidence and counterevidence <span>Review details</span></summary><div className="evidence-detail-grid"><div><strong>Evidence summary</strong><p>{c.evidence}</p></div><div><strong>Alternative / counterevidence</strong><p>{c.alternative}</p></div></div></details><div className="candidate-bottom"><span className="candidate-status"><span/> {c.status}</span>{c.selected&&<span className="selected-label"><Check size={13}/> Included in handoff</span>}</div></article>)}</div>}</section>
 {isCurrent?<StageGate stage="world_concern_radar" decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={onDecision} selectedCount={selected.length} options={[{value:"selected_items",label:"Advance selected problem IDs",help:"Only checked IDs move to Problem Validation."},{value:"request_more_evidence",label:"Request more evidence",help:"Stay at this stage and strengthen the candidate pool."},{value:"revise",label:"Revise the candidate pool",help:"Change statements, scope or inclusion criteria."},{value:"stop",label:"Stop this run",help:"End this run without advancing the candidates."}]}/>:<DecisionHistory items={run.decisions.filter(d=>d.stage==="world_concern_radar")}/>}
 </StagePage>;
}
function ValidationView({run,stage,decision,setDecision,rationale,setRationale,onDecision,onCreate}:{run:Run|null;stage:"problem_validation"|"opportunity_validation"|"product_development";decision:string;setDecision:(s:string)=>void;rationale:string;setRationale:(s:string)=>void;onDecision:()=>void;onCreate:()=>void}) {
 if(!run)return <MissingRun title="Select a research run" description="This stage works only on problems that were carried forward from the Radar." onCreate={onCreate}/>;
 const current=run.stage===stage;
 const items=run.concerns.filter(c=>c.selected);
 const configs: Record<"problem_validation"|"opportunity_validation"|"product_development",{lead:string;intro:string;checks:string[];options:{value:string;label:string;help:string}[]}>={
  problem_validation:{lead:"Validate the selected problem",intro:"Determine whether each selected problem is real and significant in the specified population—and whether evidence shows it remains unresolved.",checks:["Magnitude and denominator","Severity and experienced outcomes","Comparable trajectory or explicit UNKNOWN","Evidence tier, limitations and subgroup differences","Existing responses and measured performance","Counterevidence, alternatives and falsification conditions"],options:[{value:"approved",label:"Accept for opportunity research",help:"The evidence is sufficient for the next research stage."},{value:"request_more_evidence",label:"Request additional evidence",help:"Do not advance until specific evidence gaps are addressed."},{value:"revise",label:"Revise / re-scope the problem",help:"The problem statement or population needs work."},{value:"stop",label:"Stop this problem",help:"Evidence does not justify further work."}]},
  opportunity_validation:{lead:"Test whether an opportunity exists",intro:"Keep this separate from problem validation. A real human need does not automatically imply demand for a particular product.",checks:["Specific user, beneficiary, buyer and use context","Existing solutions, substitutes and workarounds","Demand and behavior evidence, not stated interest alone","Access, affordability, feasibility and safety","Intervention plausibility and outcome evidence","Falsification conditions, alternatives and unknowns"],options:[{value:"approved",label:"Approve product exploration",help:"There is a justified hypothesis to test through product development."},{value:"request_more_evidence",label:"Gather more opportunity evidence",help:"Keep the opportunity open but unresolved."},{value:"revise",label:"Revise the opportunity hypothesis",help:"Change the proposed intervention or target context."},{value:"stop",label:"Stop opportunity work",help:"Evidence does not justify product exploration."}]},
  product_development:{lead:"Approve a measurable experiment",intro:"Translate the approved opportunity into a small, falsifiable experiment. Do not claim product efficacy before testing.",checks:["Target user and use context","Testable hypothesis tied to the validated problem","Smallest useful prototype or experiment","Primary outcome and guardrail measures","Decision threshold and stop condition","Privacy, accessibility, safety and dependencies"],options:[{value:"approved",label:"Approve the experiment plan",help:"Authorize this experiment for planning or build."},{value:"request_more_evidence",label:"Request more evidence",help:"Clarify assumptions before approving the experiment."},{value:"revise",label:"Revise the experiment",help:"Change scope, metric, prototype or decision threshold."},{value:"stop",label:"Stop product work",help:"Do not proceed with this experiment."}]}
 };
 const c=configs[stage];
 return <StagePage stage={stage} run={run} lead={c.lead} intro={c.intro}><section className="surface-panel validation-items"><div className="panel-heading"><div><h2>Items in scope</h2><p>Only reviewer-selected IDs are shown here.</p></div><span className="quiet-count">{items.length} problem{items.length===1?"":"s"}</span></div>{items.length===0?<EmptyState icon={<ShieldAlert size={21}/>} title="No selected problem IDs" description="Return to World Concern Radar and select at least one problem before validation."/>:items.map(item=><div className="validation-item" key={item.id}><span className="candidate-id">{item.id}</span><div><h3>{item.title}</h3><p>{item.population} · {item.geography}</p><details className="evidence-details"><summary>Current evidence record</summary><div className="evidence-detail-grid"><div><strong>Evidence</strong><p>{item.evidence}</p></div><div><strong>Counterevidence</strong><p>{item.alternative}</p></div></div></details></div></div>)}</section><section className="surface-panel checklist-panel"><div className="panel-heading"><div><h2>Review checklist</h2><p>Use this to structure the dossier. Unavailable checks stay UNKNOWN.</p></div><span className="mini-icon"><ListChecks size={18}/></span></div><div className="review-checks">{c.checks.map((check,i)=><div key={check}><span>{String(i+1).padStart(2,"0")}</span><p>{check}</p></div>)}</div><div className="research-note"><BookOpen size={18}/><div><strong>Evidence integrity rule</strong><p>Separate experienced harm from reported concern and modelled exposure. State what was searched; “not found” is not proof the problem does not exist.</p></div></div></section>{current?<StageGate stage={stage} decision={decision} setDecision={setDecision} rationale={rationale} setRationale={setRationale} onDecision={onDecision} options={[...c.options]}/>:<DecisionHistory items={run.decisions.filter(d=>d.stage===stage)}/>}</StagePage>;
}
function MissingRun({title,description,onCreate}:{title:string;description:string;onCreate:()=>void}) {
 return <div className="view-stack"><PageIntro eyebrow="RESEARCH WORKFLOW" title={title} description={description}/><section className="surface-panel"><EmptyState icon={<FolderOpen size={23}/>} title="No active research run" description="Create a run first. Each stage shares its scope, candidates and decision history." action={<button className="primary-button" onClick={onCreate}><Plus size={17}/> Create research run</button>}/></section></div>;
}
function Detail({label,value}:{label:string;value:string}) {return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>;}
function DecisionHistory({items}:{items:Decision[]}) {
 if(!items.length)return <section className="surface-panel"><EmptyState icon={<ClipboardCheck size={21}/>} title="No decision recorded yet" description="When a human reviews this stage, the rationale and selected item IDs will appear here."/></section>;
 return <section className="surface-panel"><div className="panel-heading"><div><h2>Decision history</h2><p>Locally stored decisions for this stage.</p></div></div><div className="decision-list">{items.slice().reverse().map((d,i)=><article key={d.at+i} className="decision-card"><div className="decision-card-top"><span className="decision-icon"><CheckCircle2 size={16}/></span><div><strong>{stageFor(d.stage).title}</strong><small>{new Date(d.at).toLocaleString()}</small></div><span className="decision-type">{d.decision.replaceAll("_"," ")}</span></div><p>{d.rationale}</p><div className="decision-ids">Selected IDs: {d.selectedIds.join(", ")||"None"}</div></article>)}</div></section>;
}
function EvidenceView({runs}:{runs:Run[]}) {
 const entries=runs.flatMap(r=>r.concerns.map(c=>({run:r,concern:c})));
 return <div className="view-stack"><PageIntro eyebrow="RESEARCH LIBRARY" title="Evidence library" description="Review source and counterevidence notes attached to candidate problems. This is a local view, not a verified source registry."/>{entries.length===0?<section className="surface-panel"><EmptyState icon={<BookOpen size={22}/>} title="No evidence notes yet" description="Add candidate problems with source details to see the evidence notes here."/></section>:<section className="surface-panel"><div className="panel-heading"><div><h2>Evidence notes</h2><p>{entries.length} candidate records across {runs.length} runs.</p></div></div><div className="evidence-library-list">{entries.map(({run,concern})=><article className="evidence-library-row" key={run.id+concern.id}><span className="candidate-id">{concern.id}</span><div><h3>{concern.title}</h3><p>{run.title} · {concern.population} · {concern.geography}</p><details className="evidence-details"><summary>Open evidence and counterevidence</summary><div className="evidence-detail-grid"><div><strong>Evidence</strong><p>{concern.evidence}</p></div><div><strong>Alternative / counterevidence</strong><p>{concern.alternative}</p></div></div></details></div></article>)}</div></section>}</div>;
}
function DecisionLog({
  run,
  runs,
  onSelect,
}: {
  run: Run | null;
  runs: Run[];
  onSelect: (r: Run) => void;
}) {
  const all = runs
    .flatMap((item) =>
      item.decisions.map((decision) => ({ run: item, decision })),
    )
    .sort((a, b) => b.decision.at.localeCompare(a.decision.at));

  return (
    <div className="view-stack">
      <PageIntro
        eyebrow="GOVERNANCE"
        title="Decision log"
        description="The record of reviewer choices, rationale and selected IDs. Decisions in this prototype are local records, not server-enforced approvals."
      />
      <section className="surface-panel">
        <div className="panel-heading">
          <div>
            <h2>Human decisions</h2>
            <p>{all.length} decisions across {runs.length} runs.</p>
          </div>
          {run ? (
            <span className="quiet-count">Active: {run.title}</span>
          ) : null}
        </div>
        {all.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={22} />}
            title="No decisions recorded"
            description="Every stage ends with an explicit decision and rationale."
          />
        ) : (
          <div className="decision-list">
            {all.map(({ run: itemRun, decision }, index) => (
              <article
                key={itemRun.id + decision.at + index}
                className="decision-card"
              >
                <div className="decision-card-top">
                  <span className="decision-icon">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <strong>{stageFor(decision.stage).title}</strong>
                    <small>
                      {itemRun.title} · {new Date(decision.at).toLocaleString()}
                    </small>
                  </div>
                  <span className="decision-type">
                    {decision.decision.replaceAll("_", " ")}
                  </span>
                </div>
                <p>{decision.rationale}</p>
                <div className="decision-footer">
                  <span>
                    Selected IDs: {decision.selectedIds.join(", ") || "None"}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => onSelect(itemRun)}
                  >
                    Open run <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
