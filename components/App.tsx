"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AiError, providerLabel, refineLead, type Provider } from "@/lib/ai";
import { analyzeAll } from "@/lib/analyze";
import { deserialize, serialize, STORAGE_KEY } from "@/lib/persist";
import { buildSeed } from "@/lib/seed";
import type { AppState, Rule } from "@/lib/types";
import * as wf from "@/lib/workflow";
import AddLead from "./AddLead";
import Dashboard from "./Dashboard";
import ExportView from "./ExportView";
import HowItWorks from "./HowItWorks";
import Inbox, { visibleLeads, type StatusFilter, type TierFilter } from "./Inbox";
import LeadDetail from "./LeadDetail";
import SettingsView from "./Settings";
import { Icon, Spinner, type IconName } from "./ui";

type View = "inbox" | "add" | "dashboard" | "export" | "settings" | "guide";
const NAV: { name: Exclude<View, "add">; label: string; icon: IconName }[] = [
  { name: "inbox", label: "Inbox", icon: "inbox" },
  { name: "dashboard", label: "Dashboard", icon: "chart" },
  { name: "export", label: "Export", icon: "export" },
  { name: "settings", label: "Settings", icon: "settings" },
  { name: "guide", label: "How it works", icon: "book" },
];
const SESSION_KEY = "lead-desk:ai-key-session";

export const SAFETY_NOTICE = "AI only suggests. A person approves every lead, and this app never emails or contacts anyone. All people and companies are fictional.";

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false); // phone drill-in
  const [tier, setTier] = useState<TierFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [keep, setKeep] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let loaded: AppState | null = null;
    try {
      loaded = deserialize(window.localStorage.getItem(STORAGE_KEY));
      const k = window.sessionStorage.getItem(SESSION_KEY);
      if (k) (setApiKey(k), setKeep(true));
    } catch {
      loaded = null;
    }
    const s = loaded ?? buildSeed();
    setState(s);
    setNow(new Date());
    setSelectedId(s.leads[0]?.id ?? null);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize(state));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state]);

  useEffect(() => {
    try {
      if (keep && apiKey) window.sessionStorage.setItem(SESSION_KEY, apiKey);
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch { /* storage blocked: the key just stays in memory */ }
  }, [keep, apiKey]);

  useEffect(() => { topRef.current?.scrollIntoView({ block: "start" }); }, [view, showDetail]);

  const analysis = useMemo(() => (state ? analyzeAll(state, now) : null), [state, now]);
  const list = useMemo(() => (state && analysis ? visibleLeads(state.leads, analysis, tier, status, query) : []), [state, analysis, tier, status, query]);

  const run = useCallback((fn: (s: AppState, n: Date) => AppState) => setState((p) => (p ? fn(p, new Date()) : p)), []);
  const selected = state?.leads.find((l) => l.id === selectedId) ?? null;
  const an = selected && analysis ? analysis.get(selected.id) ?? null : null;

  const approveSelected = useCallback(() => {
    if (!selectedId) return;
    setState((p) => (p ? wf.approve(p, selectedId, new Date(), analyzeAll(p, new Date())) : p));
  }, [selectedId]);

  // Keyboard: j/k to move, a to approve. Ignored while typing or when a modifier is held.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "inbox" || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "k") {
        if (!list.length) return;
        const i = list.findIndex((l) => l.id === selectedId);
        const next = e.key === "j" ? Math.min(list.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
        setSelectedId(list[next].id);
        e.preventDefault();
      } else if (e.key === "a" && selected?.status === "new") {
        approveSelected();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, list, selectedId, selected, approveSelected]);

  if (!state || !analysis) {
    return <div className="app"><div className="boot"><Spinner label="Loading Lead Desk…" /></div></div>;
  }

  const waiting = state.leads.filter((l) => analysis.get(l.id)?.sla.state.startsWith("waiting")).length;
  const actions = (id: string) => ({
    approve: () => run((s, n) => wf.approve(s, id, n, analyzeAll(s, n))),
    override: (t: Parameters<typeof wf.override>[2]["tier"], o: string | null, reason: string) => run((s, n) => wf.override(s, id, { tier: t, owner: o, reason }, n, analyzeAll(s, n))),
    disqualify: (reason: string) => run((s, n) => wf.disqualify(s, id, reason, n)),
    merge: (into: string) => run((s, n) => wf.mergeDuplicate(s, id, into, n)),
    reopen: () => run((s, n) => wf.reopen(s, id, n)),
    contacted: () => run((s, n) => wf.markContacted(s, id, n)),
    setDraft: (text: string | null) => run((s) => wf.setDraft(s, id, text)),
    clearAi: () => run((s, n) => wf.setAi(s, id, null, n)),
    refine: async () => {
      if (!selected || !an || !apiKey) return;
      setAiBusy(true);
      setAiNote(null);
      try {
        const r = await refineLead({ provider, apiKey, lead: selected, factors: an.score.factors, owner: an.owner });
        run((s, n) => wf.setAi(wf.setDraft(s, id, null), id, { reasons: r.reasons, draft: r.draft, provider: providerLabel(provider) }, n));
      } catch (e) {
        setAiNote((e instanceof AiError ? e.message : "The AI step failed.") + " The rule-based result is still shown.");
      } finally {
        setAiBusy(false);
      }
    },
  });

  const go = (v: View) => { setView(v); setShowDetail(false); };
  const updateRules = (rules: Rule[]) => setState((p) => (p ? { ...p, settings: { ...p.settings, rules } } : p));
  const act = selected ? actions(selected.id) : null;

  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /><span className="blob b4" /></div>
      <div className="shell">
        <nav className="nav glass glass-float" aria-label="Main">
          <div className="nav-brand"><span className="logo" aria-hidden="true"><Icon name="flag" size={20} /></span><span className="brand-name">Lead Desk</span></div>
          <ul className="nav-list">
            {NAV.map((n) => (
              <li key={n.name}>
                <button type="button" className="nav-item" data-testid={`nav-${n.name}`} aria-current={view === n.name || (n.name === "inbox" && view === "add") ? "page" : undefined} onClick={() => go(n.name)}>
                  <Icon name={n.icon} size={22} /><span className="nav-label">{n.name === "guide" ? "Guide" : n.label}</span>
                  {n.name === "inbox" && waiting > 0 && <span className="nav-count" aria-label={`${waiting} waiting for a reply`}>{waiting}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="main" id="main">
          <div ref={topRef} className="scroll-anchor" />
          <p className="demo-banner glass" data-testid="safety-banner" role="note"><Icon name="shield" size={16} /> {SAFETY_NOTICE}</p>
          {saveError && <p className="inline-error" role="alert"><Icon name="alert" size={16} /> Couldn&apos;t save to this browser (storage is full or blocked). Changes will be lost when you close the tab.</p>}

          {view === "inbox" && (
            <div className={`split${showDetail ? " show-detail" : ""}`}>
              <div className="split-list">
                <Inbox leads={list} all={state.leads} analysis={analysis} selectedId={selectedId} tier={tier} status={status} query={query}
                  onTier={setTier} onStatus={setStatus} onQuery={setQuery} onSelect={(id) => { setSelectedId(id); setShowDetail(true); setAiNote(null); }} onAdd={() => go("add")} />
                <p className="small muted kbd-hint">Shortcuts: <kbd>j</kbd> next, <kbd>k</kbd> previous, <kbd>a</kbd> approve.</p>
              </div>
              <div className="split-detail">
                {selected && an && act ? (
                  <LeadDetail key={selected.id} lead={selected} a={an} leads={state.leads} log={state.log.filter((e) => e.leadId === selected.id)} hasKey={!!apiKey} aiBusy={aiBusy} aiNote={aiNote}
                    providerName={providerLabel(provider)} onBack={() => setShowDetail(false)}
                    actions={{ approve: act.approve, override: act.override, disqualify: act.disqualify, merge: act.merge, reopen: act.reopen, contacted: act.contacted, setDraft: act.setDraft, refine: act.refine, clearAi: act.clearAi }} />
                ) : (
                  <div className="empty"><h3>Pick a lead</h3><p className="muted">Choose one from the list to see its score and decide.</p></div>
                )}
              </div>
            </div>
          )}
          {view === "add" && <AddLead onCancel={() => go("inbox")} onAdd={(input) => {
            const n = new Date();
            const next = wf.addLead(state, input, n);
            setState(next);
            setSelectedId(next.leads[0].id);
            setTier("all"); setStatus("all"); setQuery("");
            setView("inbox");
            setShowDetail(true);
          }} />}
          {view === "dashboard" && <Dashboard leads={state.leads} analysis={analysis} log={state.log} />}
          {view === "export" && <ExportView leads={state.leads} analysis={analysis} />}
          {view === "guide" && <HowItWorks />}
          {view === "settings" && (
            <SettingsView rules={state.settings.rules} actor={state.settings.actor} provider={provider} apiKey={apiKey} keepInSession={keep}
              onRules={updateRules} onActor={(a) => run((s) => wf.setActor(s, a))} onProvider={setProvider} onKey={setApiKey} onKeep={setKeep}
              onReset={() => { const s = buildSeed(); setState(s); setSelectedId(s.leads[0].id); setTier("all"); setStatus("all"); setQuery(""); setShowDetail(false); setAiNote(null); }} />
          )}
          <footer className="footer">Lead Desk is a portfolio demo. Fictional data. Nothing is ever sent.</footer>
        </main>
      </div>
    </div>
  );
}
