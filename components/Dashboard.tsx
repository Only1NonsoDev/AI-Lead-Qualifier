"use client";

import type { AnalysisMap } from "@/lib/analyze";
import { computeStats } from "@/lib/stats";
import { formatClock, formatDuration } from "@/lib/time";
import { STATUS_LABEL, STATUSES, TIER_LABEL, type Lead, type LogEntry, type Tier } from "@/lib/types";

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone?: Tier }) {
  return (
    <li>
      <span>{label}</span>
      <span className="bar-track" aria-hidden="true"><span className={`bar-fill${tone ? ` bar-${tone}` : ""}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></span>
      <span className="bar-value">{value}</span>
    </li>
  );
}

export default function Dashboard({ leads, analysis, log }: { leads: Lead[]; analysis: AnalysisMap; log: LogEntry[] }) {
  const st = computeStats(leads, analysis);
  const maxTier = Math.max(1, ...Object.values(st.byTier));
  const maxStatus = Math.max(1, ...Object.values(st.byStatus));
  const maxLoad = Math.max(1, ...st.load.map((l) => l.count));
  return (
    <div className="stack" data-testid="dashboard">
      <div className="page-head">
        <h1 className="h1-sm">Pipeline dashboard</h1>
        <p className="muted">A live summary of the inbox. Spam is left out of tier counts and the average score.</p>
      </div>
      <div className="stat-grid">
        <div className="panel stat"><span className="stat-label">Leads</span><span className="stat-value">{st.total}</span></div>
        <div className="panel stat"><span className="stat-label">Average score</span><span className="stat-value">{st.avgScore === null ? "–" : st.avgScore.toFixed(0)}</span></div>
        <div className="panel stat"><span className="stat-label">Median time to first touch</span><span className="stat-value">{st.medianFirstTouchMin === null ? "–" : formatDuration(st.medianFirstTouchMin)}</span><span className="muted small">Goal: under 5m</span></div>
        <div className="panel stat"><span className="stat-label">Waiting past 5 minutes</span><span className="stat-value">{st.waitingLate}</span></div>
        <div className="panel stat"><span className="stat-label">Flagged (spam or duplicate)</span><span className="stat-value">{st.flagged}</span></div>
        <div className="panel stat"><span className="stat-label">Approved</span><span className="stat-value">{st.byStatus.approved}</span></div>
      </div>
      <div className="two-col">
        <section className="panel stack-sm" aria-labelledby="d-tier"><h2 id="d-tier">By tier</h2>
          <ul className="bars">{(["hot", "warm", "cold"] as Tier[]).map((t) => <Bar key={t} label={TIER_LABEL[t]} value={st.byTier[t]} max={maxTier} tone={t} />)}</ul></section>
        <section className="panel stack-sm" aria-labelledby="d-status"><h2 id="d-status">By status</h2>
          <ul className="bars">{STATUSES.map((s) => <Bar key={s} label={STATUS_LABEL[s]} value={st.byStatus[s]} max={maxStatus} />)}</ul></section>
      </div>
      <section className="panel stack-sm" aria-labelledby="d-load"><h2 id="d-load">Load per rep</h2>
        <p className="muted small">Open leads (not disqualified) by suggested or overridden owner.</p>
        <ul className="bars">{st.load.map((l) => <Bar key={l.owner} label={l.owner} value={l.count} max={maxLoad} />)}</ul></section>
      <section className="panel stack-sm" aria-labelledby="d-log"><h2 id="d-log">Activity log</h2>
        <p className="muted small">Who did what, and when. Every decision is recorded here.</p>
        {log.length === 0 ? <p className="muted">Nothing yet.</p> : <ul className="log log-tall" data-testid="activity-log">{log.map((e) => <li key={e.id}><time dateTime={e.at}>{formatClock(e.at)}</time><span><b>{e.actor}</b>: {e.text}</span></li>)}</ul>}
      </section>
    </div>
  );
}
