import type { ReactNode } from "react";

import type { Sla } from "@/lib/time";
import { STATUS_LABEL, TIER_LABEL, type Status, type Tier } from "@/lib/types";

export type IconName =
  | "check" | "alert" | "download" | "x" | "undo" | "plus" | "sparkle" | "refresh" | "inbox" | "chart" | "export" | "settings"
  | "back" | "search" | "flag" | "trash" | "info" | "copy" | "clock" | "book" | "shield" | "up" | "down" | "merge";

const PATHS: Record<IconName, ReactNode> = {
  check: <path d="M4 12.5l5 5L20 6.5" />,
  alert: (<><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.5v.01" /></>),
  download: (<><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 18v1.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V18" /></>),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  undo: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  sparkle: <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  refresh: (<><path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" /></>),
  inbox: (<><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6h-5.5a3.5 3.5 0 0 1-7 0z" /></>),
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
  export: (<><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>),
  back: <path d="M15 5l-7 7 7 7" />,
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>),
  copy: (<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  book: (<><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>),
  shield: (<><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>),
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  merge: (<><path d="M6 4v6a6 6 0 0 0 6 6h6" /><path d="M15 12l3 4-3 4" /><path d="M6 20V4" /></>),
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/** Tier pill. Colour is never the only signal: the label is always written out. */
export function TierBadge({ tier, overridden }: { tier: Tier; overridden?: boolean }) {
  return (
    <span className={`badge tier tier-${tier}`}>
      {TIER_LABEL[tier]}
      {overridden && <span className="sr-only"> (changed by a rep)</span>}
      {overridden && <span aria-hidden="true">*</span>}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge status status-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function SlaBadge({ sla }: { sla: Sla }) {
  if (sla.state === "none") return null;
  const kind = sla.state === "waiting-ok" ? "ok" : sla.state === "met" ? "met" : "late";
  const icon: IconName = kind === "met" ? "check" : kind === "ok" ? "clock" : "alert";
  return (
    <span className={`badge sla sla-${kind}`} title="Goal: first reply within 5 minutes">
      <Icon name={icon} size={14} /> {sla.label}
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty fade-in">
      <span className="empty-icon"><Icon name={icon} size={26} /></span>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="status-line" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}
