"use client";

import { useEffect, useState } from "react";

import { fullName, type Analysis } from "@/lib/analyze";
import { countryName } from "@/lib/regions";
import { NURTURE_LABEL, REPS } from "@/lib/routing";
import { formatClock } from "@/lib/time";
import { TIER_LABEL, type Factor, type FactorGroup, type Lead, type LogEntry, type Tier } from "@/lib/types";
import { Icon, SlaBadge, StatusBadge, TierBadge } from "./ui";

export type DetailActions = {
  approve: () => void;
  override: (tier: Tier | null, owner: string | null, reason: string) => void;
  disqualify: (reason: string) => void;
  merge: (intoId: string) => void;
  reopen: () => void;
  contacted: () => void;
  setDraft: (text: string | null) => void;
  refine: () => void;
  clearAi: () => void;
};

type Props = {
  lead: Lead;
  a: Analysis;
  leads: Lead[];
  log: LogEntry[];
  actions: DetailActions;
  hasKey: boolean;
  aiBusy: boolean;
  aiNote: string | null;
  providerName: string;
  onBack: () => void;
};

const GROUPS: { id: FactorGroup; title: string; hint: string }[] = [
  { id: "icp", title: "ICP fit", hint: "Does this look like a customer we win? (50 points)" },
  { id: "bant", title: "Buying intent (BANT)", hint: "Budget, Authority, Need, Timeline, read from their message. (40 points)" },
  { id: "engagement", title: "Engagement", hint: "What they did on our site and emails. (10 points)" },
];

function FactorRow({ f, ai }: { f: Factor; ai: string | undefined }) {
  return (
    <li className="factor">
      <div className="factor-top">
        <span className="factor-label">{f.label}</span>
        <span className="factor-pts" aria-label={`${f.points} of ${f.max} points`}>{f.points}<span className="muted">/{f.max}</span></span>
      </div>
      <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${(f.points / f.max) * 100}%` }} /></span>
      <p className="factor-reason">{ai ?? f.reason}{ai && <span className="badge badge-demo ai-tag">AI wording</span>}</p>
    </li>
  );
}

export default function LeadDetail({ lead, a, leads, log, actions, hasKey, aiBusy, aiNote, providerName, onBack }: Props) {
  const [mode, setMode] = useState<null | "override" | "disqualify">(null);
  const [reason, setReason] = useState("");
  const [tier, setTier] = useState<Tier>(a.tier);
  const [owner, setOwner] = useState(a.owner);
  const [copied, setCopied] = useState(false);

  // A different lead was picked: close any open form.
  useEffect(() => {
    setMode(null);
    setReason("");
    setTier(a.tier);
    setOwner(a.owner);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const original = a.duplicate ? leads.find((l) => l.id === a.duplicate!.ofId) : undefined;
  const owners = [...REPS.map((r) => r.name), NURTURE_LABEL];
  const changed = tier !== a.score.tier || owner !== a.route.owner;
  const closed = lead.status !== "new";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(a.draft);
      setCopied(true);
    } catch {
      setCopied(false);
      window.prompt("Copy the draft:", a.draft);
    }
  };

  return (
    <article className="detail stack" aria-label={`Lead: ${fullName(lead)}`}>
      <button type="button" className="btn btn-ghost back-btn" onClick={onBack}><Icon name="back" /> Back to inbox</button>

      <header className="panel stack-sm">
        <div className="section-head">
          <div className="min0">
            <h2 className="detail-name">{fullName(lead)}</h2>
            <p className="muted">{lead.title || "No title given"} at {lead.company}</p>
          </div>
          <div className="badges">
            <TierBadge tier={a.tier} overridden={!!lead.override?.tier} />
            <StatusBadge status={lead.status} />
          </div>
        </div>
        <p className="small muted">
          {lead.email} · {countryName(lead.country)} · {lead.employees ?? "?"} employees · {lead.industry || "Industry unknown"} · via {lead.source} · {formatClock(lead.receivedAt)}
        </p>
        <div className="badges"><SlaBadge sla={a.sla} /></div>
        <blockquote className="quote">{lead.message || "(no message)"}</blockquote>
      </header>

      {a.spam.isSpam && (
        <section className="notice notice-fail flag-box" aria-label="Spam warning">
          <Icon name="alert" />
          <div className="stack-sm">
            <strong>Looks like spam. Suggested action: discard.</strong>
            <ul className="plain">{a.spam.signals.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </section>
      )}
      {a.duplicate && (
        <section className="notice notice-warn flag-box" aria-label="Duplicate warning">
          <Icon name="merge" />
          <div className="stack-sm">
            <strong>Possible duplicate. Suggested action: merge.</strong>
            <span>{a.duplicate.reason}</span>
            {original && lead.status === "new" && (
              <button type="button" className="btn btn-secondary" onClick={() => actions.merge(original.id)}>
                <Icon name="merge" /> Merge into {fullName(original)}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="panel stack" aria-labelledby="score-h">
        <div className="score-head">
          <div className={`score-ring tier-ring-${a.score.tier}`} style={{ ["--pct" as string]: `${a.score.total}%` }} role="img" aria-label={`Score ${a.score.total} out of 100, ${TIER_LABEL[a.score.tier]}`}>
            <span>{a.score.total}</span>
          </div>
          <div>
            <h3 id="score-h">Suggested score: {a.score.total}/100 ({TIER_LABEL[a.score.tier]})</h3>
            <p className="muted small">Hot is 70 or more, Warm is 40 to 69, Cold is under 40. Rules, not guesses: the same lead always scores the same.</p>
            {lead.override?.tier && <p className="small"><b>Rep changed the tier</b> to {TIER_LABEL[lead.override.tier]}: {lead.override.reason}</p>}
          </div>
        </div>
        {GROUPS.map((g) => (
          <div key={g.id} className="stack-sm">
            <div>
              <h4>{g.title}</h4>
              <p className="small muted">{g.hint}</p>
            </div>
            <ul className="factors">
              {a.score.factors.filter((f) => f.group === g.id).map((f) => <FactorRow key={f.key} f={f} ai={lead.ai?.reasons[f.key]} />)}
            </ul>
          </div>
        ))}
      </section>

      <section className="panel stack-sm" aria-labelledby="route-h">
        <h3 id="route-h">Suggested owner: {a.route.owner}</h3>
        <p className="muted">{a.route.explanation}</p>
        {lead.override?.owner && <p className="small"><b>Rep changed the owner</b> to {lead.override.owner}: {lead.override.reason}</p>}
      </section>

      <section className="panel stack-sm" aria-labelledby="decide-h">
        <h3 id="decide-h">Your decision</h3>
        <p className="muted small">The AI only suggests. Nothing happens until you choose, and nothing is ever sent to the lead from this app.</p>
        {closed ? (
          <div className="stack-sm">
            <p>{lead.status === "approved" ? "Approved." : "Disqualified."} {lead.decisionReason && <>Reason: {lead.decisionReason}</>}</p>
            <div className="actions"><button type="button" className="btn btn-secondary" onClick={actions.reopen}><Icon name="undo" /> Reopen for review</button></div>
          </div>
        ) : mode === null ? (
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={actions.approve} data-testid="approve"><Icon name="check" /> Approve suggestion <kbd>a</kbd></button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode("override")}><Icon name="flag" /> Override…</button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode("disqualify")}><Icon name="trash" /> Disqualify…</button>
          </div>
        ) : mode === "override" ? (
          <form className="stack-sm" onSubmit={(e) => { e.preventDefault(); actions.override(tier !== a.score.tier ? tier : null, owner !== a.route.owner ? owner : null, reason); setMode(null); setReason(""); }}>
            <div className="fields">
              <div className="field"><label htmlFor="ov-tier">Tier</label>
                <select id="ov-tier" className="input" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
                  {(["hot", "warm", "cold"] as Tier[]).map((t) => <option key={t} value={t}>{TIER_LABEL[t]}{t === a.score.tier ? " (suggested)" : ""}</option>)}
                </select></div>
              <div className="field"><label htmlFor="ov-owner">Owner</label>
                <select id="ov-owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)}>
                  {owners.map((o) => <option key={o} value={o}>{o}{o === a.route.owner ? " (suggested)" : ""}</option>)}
                </select></div>
              <div className="field span-2"><label htmlFor="ov-reason">Reason (required)</label>
                <input id="ov-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the suggestion wrong?" /></div>
            </div>
            {!changed && <p className="small muted">Change the tier or owner to continue.</p>}
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={!changed || !reason.trim()}>Save override and approve</button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <form className="stack-sm" onSubmit={(e) => { e.preventDefault(); actions.disqualify(reason); setMode(null); setReason(""); }}>
            <div className="field"><label htmlFor="dq-reason">Reason (required)</label>
              <input id="dq-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spam, student, competitor" /></div>
            <div className="actions">
              <button type="submit" className="btn btn-danger" disabled={!reason.trim()}>Disqualify lead</button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      {!a.spam.isSpam && lead.status !== "disqualified" && (
        <section className="panel stack-sm" aria-labelledby="draft-h">
          <h3 id="draft-h">Draft first reply</h3>
          <p className="muted small">A starting point for you to edit. Copy it into your own email tool: this app cannot send it.</p>
          <label className="sr-only" htmlFor="draft">Draft email</label>
          <textarea id="draft" className="input draft" rows={10} value={a.draft} onChange={(e) => actions.setDraft(e.target.value)} />
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={copy}><Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy draft"}</button>
            {lead.draftEdit !== null && <button type="button" className="btn btn-ghost" onClick={() => actions.setDraft(null)}><Icon name="undo" /> Reset draft</button>}
            <button type="button" className="btn btn-secondary" onClick={actions.refine} disabled={!hasKey || aiBusy} title={hasKey ? "" : "Add an API key in Settings to use this"}>
              <Icon name="sparkle" /> {aiBusy ? "Asking AI…" : lead.ai ? "Refine again with AI" : "Refine with AI"}
            </button>
            {lead.ai && <button type="button" className="btn btn-ghost" onClick={actions.clearAi}>Remove AI wording</button>}
          </div>
          {!hasKey && <p className="small muted">Optional: add your own OpenAI or Anthropic key in Settings to reword the reasons and draft. Scores stay rule-based either way.</p>}
          {aiNote && <p className="small notice notice-warn" role="status">{aiNote}</p>}
          {lead.ai && <p className="small muted">Wording by {lead.ai.provider || providerName}. Points were not changed.</p>}
          <div className="actions">
            {lead.firstTouchAt ? (
              <span className="badge badge-pass"><Icon name="check" size={14} /> First reply marked {formatClock(lead.firstTouchAt)}</span>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={actions.contacted}><Icon name="clock" /> I sent my reply (stops the timer)</button>
            )}
          </div>
        </section>
      )}

      <section className="panel stack-sm" aria-labelledby="hist-h">
        <h3 id="hist-h">History</h3>
        {log.length === 0 ? <p className="muted small">No activity on this lead yet.</p> : (
          <ul className="log">{log.map((e) => <li key={e.id}><time dateTime={e.at}>{formatClock(e.at)}</time><span><b>{e.actor}</b>: {e.text}</span></li>)}</ul>
        )}
      </section>
    </article>
  );
}
