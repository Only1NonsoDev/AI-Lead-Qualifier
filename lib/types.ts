export type Source = "web form" | "demo request" | "chat" | "event list";
export const SOURCES: Source[] = ["web form", "demo request", "chat", "event list"];

export type Tier = "hot" | "warm" | "cold";
export const TIER_LABEL: Record<Tier, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export type Status = "new" | "approved" | "disqualified";
export const STATUSES: Status[] = ["new", "approved", "disqualified"];
export const STATUS_LABEL: Record<Status, string> = { new: "Needs review", approved: "Approved", disqualified: "Disqualified" };

export type Engagement = {
  pageViews: number;
  pricingViewed: boolean;
  demoRequested: boolean;
  emailOpens: number;
};

/** A rep's manual change to what the AI suggested. The reason is mandatory. */
export type Override = { tier: Tier | null; owner: string | null; reason: string };

export type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title: string;
  /** Headcount; null when the lead did not say. */
  employees: number | null;
  industry: string;
  /** ISO 3166 alpha-2 code, e.g. US, GB, CA. */
  country: string;
  source: Source;
  message: string;
  receivedAt: string;
  engagement: Engagement;
  status: Status;
  /** When a rep first replied (they send it themselves, outside the app). */
  firstTouchAt: string | null;
  override: Override | null;
  decisionReason: string | null;
  /** The rep's edited reply; null means "use the generated draft". */
  draftEdit: string | null;
  /** Optional AI-written text. It only ever replaces wording, never points. */
  ai: AiRefinement | null;
};

export type AiRefinement = { reasons: Record<string, string>; draft: string | null; provider: string };

export type FactorGroup = "icp" | "bant" | "engagement";
export type Factor = {
  key: string;
  group: FactorGroup;
  label: string;
  points: number;
  max: number;
  reason: string;
};

export type ScoreResult = { total: number; tier: Tier; factors: Factor[] };

export type Region = "US" | "CA" | "UK" | "EU" | "Other";

export type Target = { kind: "rep"; rep: string } | { kind: "pool"; role: Role } | { kind: "nurture" };
export type RuleField = "employees" | "region" | "tier" | "source";
export type RuleOp = "gte" | "lt" | "is";
export type Rule = { id: string; name: string; enabled: boolean; field: RuleField; op: RuleOp; value: string | number; target: Target };

export type Role = "AE Enterprise" | "AE UK" | "SDR";
export type Rep = { name: string; role: Role };

export type LogEntry = { id: string; at: string; actor: string; leadId: string | null; text: string };

export type Settings = { rules: Rule[]; actor: string };

export type AppState = { leads: Lead[]; log: LogEntry[]; settings: Settings };
