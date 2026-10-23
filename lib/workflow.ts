import { fullName, type AnalysisMap } from "./analyze";
import { scoreLead } from "./score";
import { SOURCES, TIER_LABEL, type AppState, type Lead, type LogEntry, type Tier } from "./types";

export function addLog(state: AppState, now: Date, leadId: string | null, text: string): AppState {
  const entry: LogEntry = { id: `log-${now.getTime()}-${state.log.length}`, at: now.toISOString(), actor: state.settings.actor, leadId, text };
  return { ...state, log: [entry, ...state.log] };
}

const patch = (state: AppState, id: string, fn: (l: Lead) => Lead): AppState => ({ ...state, leads: state.leads.map((l) => (l.id === id ? fn(l) : l)) });
const find = (state: AppState, id: string) => state.leads.find((l) => l.id === id);

/** Accept the AI's suggestion exactly as shown. */
export function approve(state: AppState, id: string, now: Date, analysis: AnalysisMap): AppState {
  const lead = find(state, id);
  const a = analysis.get(id);
  if (!lead || !a || lead.status === "approved") return state;
  const next = patch(state, id, (l) => ({ ...l, status: "approved", decisionReason: null }));
  return addLog(next, now, id, `Approved ${fullName(lead)} as ${TIER_LABEL[a.tier]}, owner ${a.owner}.`);
}

export type OverrideInput = { tier: Tier | null; owner: string | null; reason: string };

/** Change the tier and/or owner. A reason is required so the log explains why the AI was wrong. */
export function override(state: AppState, id: string, input: OverrideInput, now: Date, analysis: AnalysisMap): AppState {
  const lead = find(state, id);
  const a = analysis.get(id);
  const reason = input.reason.trim();
  if (!lead || !a || !reason) return state;
  const tier = input.tier && input.tier !== a.score.tier ? input.tier : null;
  const owner = input.owner && input.owner !== a.route.owner ? input.owner : null;
  if (!tier && !owner) return state;
  const next = patch(state, id, (l) => ({ ...l, status: "approved", override: { tier, owner, reason }, decisionReason: reason }));
  const bits = [tier ? `tier ${TIER_LABEL[a.score.tier]} to ${TIER_LABEL[tier]}` : "", owner ? `owner ${a.route.owner} to ${owner}` : ""].filter(Boolean).join(" and ");
  return addLog(next, now, id, `Overrode ${fullName(lead)}: ${bits}. Reason: ${reason}`);
}

export function disqualify(state: AppState, id: string, reason: string, now: Date): AppState {
  const lead = find(state, id);
  const r = reason.trim();
  if (!lead || !r || lead.status === "disqualified") return state;
  return addLog(patch(state, id, (l) => ({ ...l, status: "disqualified", decisionReason: r })), now, id, `Disqualified ${fullName(lead)}. Reason: ${r}`);
}

export function mergeDuplicate(state: AppState, id: string, intoId: string, now: Date): AppState {
  const lead = find(state, id);
  const into = find(state, intoId);
  if (!lead || !into) return state;
  const reason = `Duplicate, merged into ${fullName(into)} (${into.company}).`;
  return addLog(patch(state, id, (l) => ({ ...l, status: "disqualified", decisionReason: reason })), now, id, `Merged ${fullName(lead)} into ${fullName(into)}.`);
}

export function reopen(state: AppState, id: string, now: Date): AppState {
  const lead = find(state, id);
  if (!lead || lead.status === "new") return state;
  return addLog(patch(state, id, (l) => ({ ...l, status: "new", override: null, decisionReason: null })), now, id, `Reopened ${fullName(lead)} for review.`);
}

/** The rep says they replied (they sent it themselves). Starts and stops the speed-to-lead clock. */
export function markContacted(state: AppState, id: string, now: Date): AppState {
  const lead = find(state, id);
  if (!lead || lead.firstTouchAt) return state;
  return addLog(patch(state, id, (l) => ({ ...l, firstTouchAt: now.toISOString() })), now, id, `Marked first reply sent to ${fullName(lead)}.`);
}

export function setDraft(state: AppState, id: string, text: string | null): AppState {
  return patch(state, id, (l) => ({ ...l, draftEdit: text }));
}

export function setAi(state: AppState, id: string, ai: Lead["ai"], now: Date): AppState {
  const lead = find(state, id);
  if (!lead) return state;
  return addLog(patch(state, id, (l) => ({ ...l, ai })), now, id, ai ? `Added AI-refined wording from ${ai.provider} for ${fullName(lead)}. Points unchanged.` : `Removed AI wording for ${fullName(lead)}.`);
}

export type NewLeadInput = Pick<Lead, "firstName" | "lastName" | "email" | "company" | "title" | "industry" | "country" | "source" | "message"> & { employees: number | null };

export function validateNewLead(i: NewLeadInput): string | null {
  if (!i.firstName.trim()) return "Add a first name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) return "Add a valid email address, like name@company.example.";
  if (!i.company.trim()) return "Add a company name.";
  if (i.employees !== null && (!Number.isFinite(i.employees) || i.employees < 0)) return "Employees must be zero or more.";
  if (!SOURCES.includes(i.source)) return "Pick a source.";
  return null;
}

export function addLead(state: AppState, input: NewLeadInput, now: Date): AppState {
  if (validateNewLead(input)) return state;
  const id = `lead-${now.getTime().toString(36)}-${state.leads.length}`;
  const lead: Lead = {
    id,
    firstName: input.firstName.trim(), lastName: input.lastName.trim(), email: input.email.trim(),
    company: input.company.trim(), title: input.title.trim(), employees: input.employees,
    industry: input.industry.trim(), country: input.country, source: input.source, message: input.message.trim(),
    receivedAt: now.toISOString(),
    engagement: { pageViews: 1, pricingViewed: false, demoRequested: input.source === "demo request", emailOpens: 0 },
    status: "new", firstTouchAt: null, override: null, decisionReason: null, draftEdit: null, ai: null,
  };
  const s = scoreLead(lead);
  return addLog({ ...state, leads: [lead, ...state.leads] }, now, id, `Added lead ${fullName(lead)} from ${lead.source}; suggested score ${s.total} (${TIER_LABEL[s.tier]}).`);
}

export function setActor(state: AppState, actor: string): AppState {
  return { ...state, settings: { ...state.settings, actor } };
}
