import type { AnalysisMap } from "./analyze";
import { UNASSIGNED } from "./routing";
import { minutesBetween } from "./time";
import { STATUSES, type Lead, type Status, type Tier } from "./types";

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type Stats = {
  total: number;
  byTier: Record<Tier, number>;
  byStatus: Record<Status, number>;
  /** Mean suggested score of real (non-spam) leads. */
  avgScore: number | null;
  medianFirstTouchMin: number | null;
  /** Open work per owner: leads not disqualified. */
  load: { owner: string; count: number }[];
  waitingLate: number;
  flagged: number;
};

export function computeStats(leads: Lead[], analysis: AnalysisMap): Stats {
  const byTier: Record<Tier, number> = { hot: 0, warm: 0, cold: 0 };
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const scores: number[] = [];
  const touch: number[] = [];
  const load = new Map<string, number>();
  let waitingLate = 0;
  let flagged = 0;
  for (const l of leads) {
    const a = analysis.get(l.id);
    if (!a) continue;
    byStatus[l.status]++;
    if (a.flagged) flagged++;
    if (a.spam.isSpam) continue;
    byTier[a.tier]++;
    scores.push(a.score.total);
    if (l.firstTouchAt) touch.push(minutesBetween(l.receivedAt, l.firstTouchAt));
    if (a.sla.state === "waiting-late") waitingLate++;
    if (l.status !== "disqualified" && a.owner !== UNASSIGNED) load.set(a.owner, (load.get(a.owner) ?? 0) + 1);
  }
  return {
    total: leads.length,
    byTier,
    byStatus,
    avgScore: scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null,
    medianFirstTouchMin: median(touch),
    load: [...load].map(([owner, count]) => ({ owner, count })).sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner)),
    waitingLate,
    flagged,
  };
}
