"use client";

import { useState } from "react";

import { providerLabel, type Provider } from "@/lib/ai";
import { describeRule, describeTarget, REPS } from "@/lib/routing";
import type { Role, Rule, RuleField, RuleOp, Target } from "@/lib/types";
import { Icon } from "./ui";

type Props = {
  rules: Rule[];
  actor: string;
  provider: Provider;
  apiKey: string;
  keepInSession: boolean;
  onRules: (r: Rule[]) => void;
  onActor: (a: string) => void;
  onProvider: (p: Provider) => void;
  onKey: (k: string) => void;
  onKeep: (b: boolean) => void;
  onReset: () => void;
};

const FIELD_OPS: Record<RuleField, { op: RuleOp; label: string }[]> = {
  employees: [{ op: "gte", label: "is at least" }, { op: "lt", label: "is under" }],
  region: [{ op: "is", label: "is" }],
  tier: [{ op: "is", label: "is" }],
  source: [{ op: "is", label: "is" }],
};
const VALUES: Record<Exclude<RuleField, "employees">, string[]> = {
  region: ["UK/EU", "UK", "EU", "US", "CA", "Other"],
  tier: ["hot", "warm", "cold"],
  source: ["web form", "demo request", "chat", "event list"],
};

const targetKey = (t: Target) => (t.kind === "rep" ? `rep:${t.rep}` : t.kind === "pool" ? `pool:${t.role}` : "nurture");
const parseTarget = (k: string): Target => (k === "nurture" ? { kind: "nurture" } : k.startsWith("rep:") ? { kind: "rep", rep: k.slice(4) } : { kind: "pool", role: k.slice(5) as Role });

export default function SettingsView(p: Props) {
  const [confirm, setConfirm] = useState(false);
  const edit = (id: string, patch: Partial<Rule>) => p.onRules(p.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= p.rules.length) return;
    const next = [...p.rules];
    [next[i], next[j]] = [next[j], next[i]];
    p.onRules(next);
  };
  const add = () => p.onRules([...p.rules, { id: `r-${Date.now().toString(36)}`, name: "New rule", enabled: true, field: "source", op: "is", value: "chat", target: { kind: "pool", role: "SDR" } }]);

  return (
    <div className="stack">
      <div className="page-head">
        <h1 className="h1-sm">Settings</h1>
        <p className="muted">Routing rules, who you are in the log, and the optional AI key.</p>
      </div>

      <section className="panel stack" aria-labelledby="s-rules">
        <div className="section-head"><h2 id="s-rules">Routing rules</h2><button type="button" className="btn btn-secondary" onClick={add}><Icon name="plus" /> Add rule</button></div>
        <p className="muted small">Rules run top to bottom and the first match wins. A lead that matches nothing stays unassigned. Changes re-route every lead straight away.</p>
        <ol className="rules">
          {p.rules.map((r, i) => (
            <li key={r.id} className={`rule${r.enabled ? "" : " is-off"}`}>
              <div className="rule-top">
                <label className="check-inline"><input type="checkbox" checked={r.enabled} onChange={(e) => edit(r.id, { enabled: e.target.checked })} /> <span className="sr-only">Enabled: </span><span className="rule-no">{i + 1}.</span></label>
                <input className="input" aria-label={`Name of rule ${i + 1}`} value={r.name} onChange={(e) => edit(r.id, { name: e.target.value })} />
                <button type="button" className="btn btn-icon btn-ghost" aria-label={`Move rule ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" /></button>
                <button type="button" className="btn btn-icon btn-ghost" aria-label={`Move rule ${i + 1} down`} disabled={i === p.rules.length - 1} onClick={() => move(i, 1)}><Icon name="down" /></button>
                <button type="button" className="btn btn-icon btn-ghost" aria-label={`Delete rule ${i + 1}`} onClick={() => p.onRules(p.rules.filter((x) => x.id !== r.id))}><Icon name="trash" /></button>
              </div>
              <div className="rule-body">
                <span className="rule-word">If</span>
                <select className="input" aria-label={`Field of rule ${i + 1}`} value={r.field} onChange={(e) => { const f = e.target.value as RuleField; edit(r.id, { field: f, op: FIELD_OPS[f][0].op, value: f === "employees" ? 500 : VALUES[f][0] }); }}>
                  <option value="employees">employees</option><option value="region">region</option><option value="tier">tier</option><option value="source">source</option>
                </select>
                <select className="input" aria-label={`Operator of rule ${i + 1}`} value={r.op} onChange={(e) => edit(r.id, { op: e.target.value as RuleOp })}>
                  {FIELD_OPS[r.field].map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                </select>
                {r.field === "employees" ? (
                  <input className="input num" inputMode="numeric" aria-label={`Value of rule ${i + 1}`} value={String(r.value)} onChange={(e) => edit(r.id, { value: Number(e.target.value.replace(/[^\d]/g, "")) })} />
                ) : (
                  <select className="input" aria-label={`Value of rule ${i + 1}`} value={String(r.value)} onChange={(e) => edit(r.id, { value: e.target.value })}>
                    {VALUES[r.field].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                )}
                <span className="rule-word">then</span>
                <select className="input" aria-label={`Owner of rule ${i + 1}`} value={targetKey(r.target)} onChange={(e) => edit(r.id, { target: parseTarget(e.target.value) })}>
                  {REPS.map((rep) => <option key={rep.name} value={`rep:${rep.name}`}>{rep.name} ({rep.role})</option>)}
                  <option value="pool:SDR">SDR round-robin</option>
                  <option value="nurture">Nurture sequence</option>
                </select>
              </div>
              <p className="small muted">In words: {describeRule(r)} → {describeTarget(r.target)}</p>
            </li>
          ))}
        </ol>
        {p.rules.length === 0 && <p className="muted">No rules: every lead will be unassigned.</p>}
      </section>

      <section className="panel stack-sm" aria-labelledby="s-actor">
        <h2 id="s-actor">Acting as</h2>
        <p className="muted small">The rep shown in the activity log for your decisions. Reps are fictional.</p>
        <div className="field narrow"><label htmlFor="actor">Rep</label>
          <select id="actor" className="input" value={p.actor} onChange={(e) => p.onActor(e.target.value)}>{REPS.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.role})</option>)}</select></div>
      </section>

      <section className="panel stack-sm" aria-labelledby="s-ai">
        <h2 id="s-ai">Optional: bring your own AI key</h2>
        <p className="muted small">Scoring never needs a key. With one, the app asks the model to reword the reasons and the draft reply. Your key goes only from this browser to the provider, is never saved with the demo, and no key ships with this site. If the call fails, you keep the rule-based text.</p>
        <div className="row-form">
          <div className="field"><label htmlFor="prov">Provider</label>
            <select id="prov" className="input" value={p.provider} onChange={(e) => p.onProvider(e.target.value as Provider)}>
              <option value="openai">{providerLabel("openai")}</option><option value="anthropic">{providerLabel("anthropic")}</option></select></div>
          <div className="field grow"><label htmlFor="key">API key</label>
            <input id="key" className="input" type="password" autoComplete="off" spellCheck={false} value={p.apiKey} onChange={(e) => p.onKey(e.target.value.trim())} placeholder="Paste a key to turn on AI wording" /></div>
          {p.apiKey && <button type="button" className="btn btn-secondary" onClick={() => p.onKey("")}>Clear key</button>}
        </div>
        <label className="check-inline"><input type="checkbox" checked={p.keepInSession} onChange={(e) => p.onKeep(e.target.checked)} /> Keep the key in this tab&apos;s session storage (cleared when the tab closes)</label>
      </section>

      <section className="panel stack-sm" aria-labelledby="s-reset">
        <h2 id="s-reset">Reset demo</h2>
        <p className="muted small">Wipes your changes and restores the sample leads, rules and log.</p>
        {confirm ? (
          <div className="confirm">
            <p>Reset everything to the starting sample data?</p>
            <div className="actions"><button type="button" className="btn btn-danger" onClick={() => { setConfirm(false); p.onReset(); }}>Yes, reset</button><button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>Cancel</button></div>
          </div>
        ) : (
          <div className="actions"><button type="button" className="btn btn-secondary" onClick={() => setConfirm(true)}><Icon name="refresh" /> Reset demo</button></div>
        )}
      </section>
    </div>
  );
}
