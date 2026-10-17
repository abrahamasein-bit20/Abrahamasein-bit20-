"use client";

import { useState } from "react";

const stages = [
  { n:"00", icon:"◉", name:"Wellbeing Research", desc:"Map wellbeing constructs, enablers and populations.", gate:"Approve research scope", status:"Foundation" },
  { n:"01", icon:"⌁", name:"World Concern Radar", desc:"Detect concerns and decompose them into testable problems.", gate:"Select problem IDs", status:"Awaiting setup" },
  { n:"02", icon:"✓", name:"Problem Validation", desc:"Test magnitude, severity, trajectory and unmet need.", gate:"Approve problem dossier", status:"Locked" },
  { n:"03", icon:"◇", name:"Opportunity Validation", desc:"Test intervention logic, demand and feasibility.", gate:"Approve opportunity", status:"Locked" },
  { n:"04", icon:"▦", name:"Product Development", desc:"Design product hypotheses and measurable experiments.", gate:"Approve experiment", status:"Locked" },
];
const nav = [{icon:"⌂",label:"Overview"},{icon:"◉",label:"Wellbeing Research"},{icon:"⌁",label:"Concern Radar"},{icon:"✓",label:"Problem Validation"},{icon:"◇",label:"Opportunity Validation"},{icon:"▦",label:"Product Development"},{icon:"▤",label:"Evidence Library"},{icon:"☷",label:"Approval Register"}];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [showBrief, setShowBrief] = useState(false);
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">i</div><div><div className="brand-name">iValth</div><div className="brand-sub">RESEARCH WORKSPACE</div></div></div>
      <div className="workspace-label">Research</div>
      <nav className="nav">{nav.map(item=><button key={item.label} className={active===item.label?"active":""} onClick={()=>setActive(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-bottom"><strong>Evidence before action</strong>Every stage requires an explicit human decision. No concern advances automatically.<div style={{marginTop:14}}>INTERNAL WORKSPACE · V0.1</div></div>
    </aside>
    <main className="main">
      <div className="topbar"><div><div className="eyebrow">iValth / Research operations</div><div className="subhead" style={{marginTop:5}}>Private workspace · Initial setup</div></div><div className="top-actions"><button className="btn" onClick={()=>setShowBrief(v=>!v)}>{showBrief?"Hide setup notes":"Setup notes"}</button><div className="avatar">iV</div></div></div>
      <div className="eyebrow">Research command centre</div><h1 className="page-title">Wellbeing research, with evidence at every gate.</h1><p className="subhead">A controlled workflow to discover human wellbeing concerns, validate selected problems, test opportunities and develop products — with human approval between every stage.</p>
      <div className="grid stats">
        <div className="card"><div className="stat-label">Active research runs <span>↗</span></div><div className="stat-value">0</div><div className="stat-note">No runs created yet</div></div>
        <div className="card"><div className="stat-label">Candidate concerns <span>⌁</span></div><div className="stat-value">0</div><div className="stat-note">Awaiting first approved scan</div></div>
        <div className="card"><div className="stat-label">Pending approvals <span>◷</span></div><div className="stat-value">0</div><div className="stat-note">No decisions are pre-filled</div></div>
        <div className="card"><div className="stat-label">Evidence records <span>▤</span></div><div className="stat-value">0</div><div className="stat-note">Records appear after connection</div></div>
      </div>
      <div className="section-head"><div><div className="section-title">The research progression</div><div className="section-note">A sequential workflow with explicit reviewer-controlled handoffs.</div></div><span className="tag tag-green">5 stages · 5 gates</span></div>
      <div className="grid stages">{stages.map(s=><div className="card stage-card" key={s.n}><div className="stage-number">Stage {s.n}</div><div className="stage-symbol">{s.icon}</div><div className="stage-name">{s.name}</div><div className="stage-desc">{s.desc}</div><div><span className={s.n==="00"?"tag tag-green":"tag"}>{s.status}</span></div><div className="gate"><span>◉</span>{s.gate}</div></div>)}</div>
      <div className="grid columns" style={{marginTop:24}}>
        <section className="card"><div className="section-head" style={{marginTop:0}}><div><div className="section-title">Research register</div><div className="section-note">All candidate items and evidence will be retained, including unselected concerns.</div></div><span className="tag">Empty</span></div><div className="empty"><strong>No research runs yet</strong>Start by defining the wellbeing research scope. The first scan should only begin after the scope is reviewed and approved.<br/><button className="btn btn-primary" style={{marginTop:14}} onClick={()=>setShowBrief(v=>!v)}>{showBrief?"Close scope checklist":"Review scope checklist"}</button></div>{showBrief&&<div className="notice" style={{marginTop:14}}><span>ⓘ</span><div><strong>Before the first run</strong><br/>Define the wellbeing constructs, population and geography, time horizon, evidence cutoff, candidate-pool constraints and stop condition. The scope approval is a human decision; this preview does not save or approve it.</div></div>}</section>
        <section className="card"><div className="section-title">Governance & evidence</div><div className="section-note">Controls intended for every research stage.</div><div className="list" style={{marginTop:10}}>
          <div className="list-row"><span className="dot"/><div><div className="list-title">Claim-level traceability</div><div className="list-desc">Factual claims must link to a source ledger row or be labelled as inference / unknown.</div></div></div>
          <div className="list-row"><span className="dot"/><div><div className="list-title">Counterevidence required</div><div className="list-desc">Alternative explanations, contradictory findings and evidence of adequate service are retained.</div></div></div>
          <div className="list-row"><span className="dot"/><div><div className="list-title">Human approval required</div><div className="list-desc">Reviewers select what advances. AI recommendations cannot approve a transition.</div></div></div>
          <div className="list-row"><span className="dot"/><div><div className="list-title">Unknown stays unknown</div><div className="list-desc">Missing data is not zero; unselected items are not silently discarded.</div></div></div>
        </div><div className="footer-note">Current build: interface scaffold. Authentication, persistent approvals and evidence API integration are not yet enabled. Do not enter confidential research material in this preview.</div></section>
      </div>
      <div className="footer-note" style={{marginTop:24}}>iValth Wellbeing Research Workspace · Internal prototype · No research or approval data has been fabricated.</div>
    </main>
  </div>;
}
