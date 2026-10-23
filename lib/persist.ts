import { DEFAULT_RULES } from "./routing";
import { REPS } from "./routing";
import { shiftIso } from "./time";
import { SOURCES, type AppState, type Lead, type LogEntry, type Rule, type Target, type Tier } from "./types";

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = `lead-desk:demo:v${SCHEMA_VERSION}`;
/** If the demo was closed longer than this, shift all times forward so waiting timers do not look absurd. */
export const STALE_AFTER_MS = 30 * 60000;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
const iso = (v: unknown): string | null => (typeof v === "string" && !Number.isNaN(new Date(v).getTime()) ? v : null);
const tier = (v: unknown): Tier | null => (v === "hot" || v === "warm" || v === "cold" ? v : null);

/** Fields are copied one by one so an API key or anything unexpected can never be saved. */
export function serialize(state: AppState, now: Date = new Date()): string {
  return JSON.stringify({
    version: SCHEMA_VERSION,
    savedAt: now.toISOString(),
    settings: { actor: state.settings.actor, rules: state.settings.rules },
    leads: state.leads.map((l): Lead => ({ ...l, ai: l.ai ? { reasons: l.ai.reasons, draft: l.ai.draft, provider: l.ai.provider } : null })),
    log: state.log,
  });
}

function readTarget(v: unknown): Target | null {
  if (!isObj(v)) return null;
  if (v.kind === "nurture") return { kind: "nurture" };
  if (v.kind === "rep" && REPS.some((r) => r.name === v.rep)) return { kind: "rep", rep: String(v.rep) };
  if (v.kind === "pool" && (v.role === "SDR" || v.role === "AE UK" || v.role === "AE Enterprise")) return { kind: "pool", role: v.role };
  return null;
}

function readRule(v: unknown): Rule | null {
  if (!isObj(v)) return null;
  const target = readTarget(v.target);
  const field = v.field;
  const op = v.op;
  if (!target || !(field === "employees" || field === "region" || field === "tier" || field === "source")) return null;
  if (!(op === "gte" || op === "lt" || op === "is")) return null;
  const value = field === "employees" ? num(v.value, NaN) : str(v.value);
  if (value === "" || Number.isNaN(value)) return null;
  return { id: str(v.id) || `r-${Math.random().toString(36).slice(2, 8)}`, name: str(v.name, "Untitled rule").slice(0, 120), enabled: v.enabled !== false, field, op, value, target };
}

function readLead(v: unknown): Lead | null {
  if (!isObj(v) || !str(v.id) || !isObj(v.engagement)) return null;
  const receivedAt = iso(v.receivedAt);
  if (!receivedAt) return null;
  const status = v.status === "approved" || v.status === "disqualified" ? v.status : "new";
  const source = SOURCES.find((s) => s === v.source) ?? "web form";
  const e = v.engagement;
  let override: Lead["override"] = null;
  if (isObj(v.override) && str(v.override.reason)) override = { tier: tier(v.override.tier), owner: str(v.override.owner) || null, reason: str(v.override.reason) };
  let ai: Lead["ai"] = null;
  if (isObj(v.ai) && isObj(v.ai.reasons)) {
    const reasons: Record<string, string> = {};
    for (const [k, r] of Object.entries(v.ai.reasons)) if (typeof r === "string") reasons[k] = r;
    ai = { reasons, draft: typeof v.ai.draft === "string" ? v.ai.draft : null, provider: str(v.ai.provider, "AI") };
  }
  return {
    id: str(v.id), firstName: str(v.firstName), lastName: str(v.lastName), email: str(v.email), company: str(v.company), title: str(v.title),
    employees: typeof v.employees === "number" && v.employees >= 0 ? v.employees : null,
    industry: str(v.industry), country: str(v.country, "US"), source, message: str(v.message), receivedAt,
    engagement: { pageViews: num(e.pageViews), pricingViewed: e.pricingViewed === true, demoRequested: e.demoRequested === true, emailOpens: num(e.emailOpens) },
    status, firstTouchAt: iso(v.firstTouchAt), override, decisionReason: typeof v.decisionReason === "string" ? v.decisionReason : null,
    draftEdit: typeof v.draftEdit === "string" ? v.draftEdit : null, ai,
  };
}

function readLog(v: unknown): LogEntry | null {
  if (!isObj(v) || !iso(v.at) || !str(v.text)) return null;
  return { id: str(v.id) || `log-${str(v.at)}`, at: str(v.at), actor: str(v.actor, "Someone"), leadId: typeof v.leadId === "string" ? v.leadId : null, text: str(v.text) };
}

/** Returns null for anything that is missing, from another version, or damaged; the caller then starts fresh. */
export function deserialize(raw: string | null, now: Date = new Date()): AppState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data) || data.version !== SCHEMA_VERSION || !Array.isArray(data.leads) || !Array.isArray(data.log)) return null;
  let leads = data.leads.map(readLead).filter((l): l is Lead => l !== null);
  if (leads.length !== data.leads.length || leads.length === 0) return null;
  let log = data.log.map(readLog).filter((l): l is LogEntry => l !== null);
  const s = isObj(data.settings) ? data.settings : {};
  const rules = Array.isArray(s.rules) ? s.rules.map(readRule).filter((r): r is Rule => r !== null) : [];
  const actor = REPS.some((r) => r.name === s.actor) ? String(s.actor) : "Dana";
  const saved = iso(data.savedAt);
  if (saved) {
    const gap = now.getTime() - new Date(saved).getTime();
    if (gap > STALE_AFTER_MS) {
      leads = leads.map((l) => ({ ...l, receivedAt: shiftIso(l.receivedAt, gap)!, firstTouchAt: shiftIso(l.firstTouchAt, gap) }));
      log = log.map((l) => ({ ...l, at: shiftIso(l.at, gap)! }));
    }
  }
  return { leads, log, settings: { actor, rules: Array.isArray(s.rules) ? rules : DEFAULT_RULES.map((r) => ({ ...r })) } };
}
