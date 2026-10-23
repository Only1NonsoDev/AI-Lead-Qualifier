import type { Lead } from "./types";

/** Industry rule of thumb: replying within 5 minutes converts far better than waiting. */
export const SLA_MINUTES = 5;

export const minutesBetween = (fromIso: string, to: Date | string): number => {
  const end = typeof to === "string" ? new Date(to).getTime() : to.getTime();
  return Math.max(0, (end - new Date(fromIso).getTime()) / 60000);
};

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 1) return "under 1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export type Sla = {
  /** waiting-ok: inside 5 min. waiting-late: still unanswered past 5 min. met/missed: already answered. none: not applicable. */
  state: "waiting-ok" | "waiting-late" | "met" | "missed" | "none";
  minutes: number;
  label: string;
};

export function slaFor(lead: Pick<Lead, "receivedAt" | "firstTouchAt" | "status">, now: Date, flagged: boolean): Sla {
  if (lead.firstTouchAt) {
    const m = minutesBetween(lead.receivedAt, lead.firstTouchAt);
    return m <= SLA_MINUTES
      ? { state: "met", minutes: m, label: `Replied in ${formatDuration(m)}` }
      : { state: "missed", minutes: m, label: `Replied in ${formatDuration(m)} (over ${SLA_MINUTES}m)` };
  }
  if (lead.status === "disqualified" || flagged) return { state: "none", minutes: 0, label: "No reply needed" };
  const m = minutesBetween(lead.receivedAt, now);
  return m <= SLA_MINUTES
    ? { state: "waiting-ok", minutes: m, label: `Waiting ${formatDuration(m)}, reply within ${SLA_MINUTES}m` }
    : { state: "waiting-late", minutes: m, label: `Waiting ${formatDuration(m)}, ${formatDuration(m - SLA_MINUTES)} over` };
}

/** Shift every timestamp so a demo that was closed for a while does not look ancient when reopened. */
export function shiftIso(iso: string | null, ms: number): string | null {
  return iso === null ? null : new Date(new Date(iso).getTime() + ms).toISOString();
}
