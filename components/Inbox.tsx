"use client";

import { useMemo } from "react";

import { fullName, type AnalysisMap } from "@/lib/analyze";
import { STATUS_LABEL, STATUSES, TIER_LABEL, type Lead, type Status, type Tier } from "@/lib/types";
import { Icon, SlaBadge, StatusBadge, TierBadge, EmptyState } from "./ui";

export type TierFilter = "all" | Tier | "flagged";
export type StatusFilter = "all" | Status;

export function matchesQuery(l: Lead, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [fullName(l), l.email, l.company, l.title, l.industry, l.message].join(" ").toLowerCase();
  return needle.split(/\s+/).every((w) => hay.includes(w));
}

/** Newest first, with unanswered hot leads surfacing ahead of the rest of the open work. */
export function visibleLeads(leads: Lead[], a: AnalysisMap, tier: TierFilter, status: StatusFilter, q: string): Lead[] {
  return leads
    .filter((l) => {
      const x = a.get(l.id);
      if (!x) return false;
      if (tier === "flagged" ? !x.flagged : tier !== "all" && x.tier !== tier) return false;
      if (status !== "all" && l.status !== status) return false;
      return matchesQuery(l, q);
    })
    .sort((p, q2) => (p.receivedAt < q2.receivedAt ? 1 : -1));
}

type Props = {
  leads: Lead[];
  all: Lead[];
  analysis: AnalysisMap;
  selectedId: string | null;
  tier: TierFilter;
  status: StatusFilter;
  query: string;
  onTier: (t: TierFilter) => void;
  onStatus: (s: StatusFilter) => void;
  onQuery: (q: string) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
};

export default function Inbox({ leads, all, analysis, selectedId, tier, status, query, onTier, onStatus, onQuery, onSelect, onAdd }: Props) {
  const counts = useMemo(() => {
    const c = { all: all.length, hot: 0, warm: 0, cold: 0, flagged: 0 };
    for (const l of all) {
      const x = analysis.get(l.id);
      if (!x) continue;
      c[x.tier]++;
      if (x.flagged) c.flagged++;
    }
    return c;
  }, [all, analysis]);
  const tabs: { id: TierFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "hot", label: TIER_LABEL.hot },
    { id: "warm", label: TIER_LABEL.warm },
    { id: "cold", label: TIER_LABEL.cold },
    { id: "flagged", label: "Flagged" },
  ];

  return (
    <section className="inbox stack-sm" aria-label="Lead inbox">
      <div className="section-head">
        <h2>Inbox</h2>
        <button type="button" className="btn btn-primary" onClick={onAdd}><Icon name="plus" /> Add a lead</button>
      </div>
      <div className="queue-tools">
        <div className="search">
          <Icon name="search" />
          <label className="sr-only" htmlFor="q">Search leads</label>
          <input id="q" className="input" type="search" placeholder="Search name, company, email…" value={query} onChange={(e) => onQuery(e.target.value)} />
        </div>
        <div className="sort">
          <label className="sr-only" htmlFor="status-f">Filter by status</label>
          <select id="status-f" className="input" value={status} onChange={(e) => onStatus(e.target.value as StatusFilter)}>
            <option value="all">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Filter by tier">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" className="tab" aria-selected={tier === t.id} onClick={() => onTier(t.id)}>
            {t.label}<span className="tab-count">{counts[t.id]}</span>
          </button>
        ))}
      </div>
      {leads.length === 0 ? (
        <EmptyState icon="inbox" title="No leads match">Try clearing the search or filters.</EmptyState>
      ) : (
        <ul className="lead-list">
          {leads.map((l) => {
            const a = analysis.get(l.id)!;
            return (
              <li key={l.id}>
                <button type="button" className={`lead-row glass lift${l.id === selectedId ? " is-selected" : ""}`} aria-current={l.id === selectedId ? "true" : undefined} data-sla={a.sla.state} onClick={() => onSelect(l.id)} data-testid={`lead-${l.id}`}>
                  <span className="lead-score" aria-label={`Score ${a.score.total}`}>{a.score.total}</span>
                  <span className="lead-main">
                    <span className="lead-name ellipsis">{fullName(l)}</span>
                    <span className="muted small ellipsis">{l.title || "No title"} · {l.company}</span>
                    <span className="badges">
                      <TierBadge tier={a.tier} overridden={!!l.override?.tier} />
                      <StatusBadge status={l.status} />
                      {a.spam.isSpam && <span className="badge badge-fail">Spam?</span>}
                      {a.duplicate && <span className="badge badge-warn">Duplicate?</span>}
                      <SlaBadge sla={a.sla} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
