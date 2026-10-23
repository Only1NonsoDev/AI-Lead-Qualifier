import { draftReply } from "./draft";
import { detectSpam, findDuplicate, type DuplicateResult, type SpamResult } from "./spam";
import { REPS, routeLeads, type RouteResult } from "./routing";
import { scoreLead } from "./score";
import { slaFor, type Sla } from "./time";
import type { AppState, Lead, ScoreResult, Tier } from "./types";

export type Analysis = {
  score: ScoreResult;
  spam: SpamResult;
  duplicate: DuplicateResult;
  route: RouteResult;
  /** Tier after any rep override. */
  tier: Tier;
  /** Owner after any rep override. */
  owner: string;
  flagged: boolean;
  sla: Sla;
  draft: string;
};

export type AnalysisMap = Map<string, Analysis>;

/** Work out everything the app shows about each lead. Pure: the same state and clock give the same answer. */
export function analyzeAll(state: AppState, now: Date): AnalysisMap {
  const { leads, settings } = state;
  const scores = new Map(leads.map((l) => [l.id, scoreLead(l)]));
  const spam = new Map(leads.map((l) => [l.id, detectSpam(l)]));
  const tiers = new Map(leads.map((l) => [l.id, scores.get(l.id)!.tier]));
  const skip = new Set(leads.filter((l) => spam.get(l.id)!.isSpam).map((l) => l.id));
  const routes = routeLeads(leads, tiers, skip, settings.rules);
  const out: AnalysisMap = new Map();
  for (const lead of leads) {
    const score = scores.get(lead.id)!;
    const route = routes.get(lead.id)!;
    const sp = spam.get(lead.id)!;
    const duplicate = findDuplicate(lead, leads);
    const tier = lead.override?.tier ?? score.tier;
    const owner = lead.override?.owner ?? route.owner;
    const flagged = sp.isSpam || duplicate !== null;
    const actor = REPS.some((r) => r.name === owner) ? owner : "";
    out.set(lead.id, {
      score, spam: sp, duplicate, route, tier, owner, flagged,
      sla: slaFor(lead, now, sp.isSpam),
      draft: lead.draftEdit ?? lead.ai?.draft ?? draftReply(lead, tier, owner, actor),
    });
  }
  return out;
}

export function fullName(l: Pick<Lead, "firstName" | "lastName">): string {
  return `${l.firstName} ${l.lastName}`.trim();
}
