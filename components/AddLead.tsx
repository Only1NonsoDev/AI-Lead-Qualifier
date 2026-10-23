"use client";

import { useMemo, useState } from "react";

import { scoreLead } from "@/lib/score";
import { COUNTRIES } from "@/lib/regions";
import { SOURCES, TIER_LABEL, type Source } from "@/lib/types";
import { validateNewLead, type NewLeadInput } from "@/lib/workflow";
import { Icon, TierBadge } from "./ui";

const EMPTY = { firstName: "", lastName: "", email: "", company: "", title: "", employees: "", industry: "", country: "US", source: "web form" as Source, message: "" };
const EXAMPLE = { firstName: "Jamie", lastName: "Rivera", email: "jamie.rivera@example.com", company: "Sample Works Demo", title: "VP Sales", employees: "250", industry: "SaaS", country: "US", source: "demo request" as Source, message: "We are struggling with slow follow-up and need a better process. Budget is approved and I decide. Hoping to start next month." };

export default function AddLead({ onAdd, onCancel }: { onAdd: (i: NewLeadInput) => void; onCancel: () => void }) {
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input: NewLeadInput = { ...f, employees: f.employees.trim() === "" ? null : Number(f.employees) };
  const live = useMemo(
    () => scoreLead({ employees: input.employees, industry: f.industry, country: f.country, title: f.title, message: f.message, engagement: { pageViews: 1, pricingViewed: false, demoRequested: f.source === "demo request", emailOpens: 0 } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f],
  );

  return (
    <section className="stack" aria-labelledby="add-h">
      <div className="page-head">
        <h1 className="h1-sm" id="add-h">Add a lead</h1>
        <p className="muted">Paste in a new inbound lead and watch it score live. Use fictional details only: this demo stores everything in your browser.</p>
      </div>
      <form className="panel stack" onSubmit={(e) => { e.preventDefault(); const err = validateNewLead(input); setError(err); if (!err) onAdd(input); }} noValidate>
        <div className="fields">
          <div className="field"><label htmlFor="al-first">First name</label><input id="al-first" className="input" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="al-last">Last name</label><input id="al-last" className="input" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="al-email">Email</label><input id="al-email" className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="al-co">Company</label><input id="al-co" className="input" value={f.company} onChange={(e) => set("company", e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="al-title">Job title</label><input id="al-title" className="input" value={f.title} onChange={(e) => set("title", e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="al-emp">Employees</label><input id="al-emp" className="input" inputMode="numeric" value={f.employees} onChange={(e) => set("employees", e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 250" /></div>
          <div className="field"><label htmlFor="al-ind">Industry</label><input id="al-ind" className="input" value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. SaaS, Logistics" /></div>
          <div className="field"><label htmlFor="al-country">Country</label>
            <select id="al-country" className="input" value={f.country} onChange={(e) => set("country", e.target.value)}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          <div className="field"><label htmlFor="al-src">Source</label>
            <select id="al-src" className="input" value={f.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="field span-2"><label htmlFor="al-msg">Their message</label><textarea id="al-msg" className="input" rows={4} value={f.message} onChange={(e) => set("message", e.target.value)} /></div>
        </div>
        <div className="live-score" aria-live="polite">
          <b>Live preview:</b> score {live.total}/100 <TierBadge tier={live.tier} /> <span className="muted small">({TIER_LABEL[live.tier]}; the final owner is picked when you add it)</span>
        </div>
        {error && <p className="inline-error" role="alert"><Icon name="alert" size={16} /> {error}</p>}
        <div className="actions">
          <button type="submit" className="btn btn-primary"><Icon name="plus" /> Add and score</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setF(EXAMPLE); setError(null); }}>Fill an example</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
