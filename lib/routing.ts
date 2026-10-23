import { regionOf } from "./regions";
import type { Lead, Rep, Rule, Target, Tier } from "./types";

export const REPS: Rep[] = [
  { name: "Dana", role: "AE Enterprise" },
  { name: "Oliver", role: "AE UK" },
  { name: "Jordan", role: "SDR" },
  { name: "Riley", role: "SDR" },
  { name: "Casey", role: "SDR" },
];

export const NURTURE_LABEL = "Nurture sequence";
export const UNASSIGNED = "Unassigned";

export const DEFAULT_RULES: Rule[] = [
  { id: "r-cold", name: "Cold leads go to nurture", enabled: true, field: "tier", op: "is", value: "cold", target: { kind: "nurture" } },
  { id: "r-ent", name: "Enterprise (500+ employees) to the Enterprise AE", enabled: true, field: "employees", op: "gte", value: 500, target: { kind: "rep", rep: "Dana" } },
  { id: "r-uk", name: "UK and EU to the UK rep", enabled: true, field: "region", op: "is", value: "UK/EU", target: { kind: "rep", rep: "Oliver" } },
  { id: "r-smb", name: "SMB (under 500) to SDR round-robin", enabled: true, field: "employees", op: "lt", value: 500, target: { kind: "pool", role: "SDR" } },
];

export type RouteResult = { ruleId: string | null; ruleName: string; owner: string; nurture: boolean; explanation: string };

export function describeRule(r: Rule): string {
  const f = r.field === "employees" ? "employees" : r.field;
  const op = r.op === "gte" ? "at least" : r.op === "lt" ? "under" : "is";
  return `${f} ${op} ${r.value}`;
}

export function describeTarget(t: Target): string {
  return t.kind === "rep" ? t.rep : t.kind === "pool" ? `${t.role} round-robin` : NURTURE_LABEL;
}

export function ruleMatches(rule: Rule, lead: Pick<Lead, "employees" | "country" | "source">, tier: Tier): boolean {
  switch (rule.field) {
    case "employees": {
      if (lead.employees === null) return false;
      const n = Number(rule.value);
      return rule.op === "gte" ? lead.employees >= n : rule.op === "lt" ? lead.employees < n : lead.employees === n;
    }
    case "region": {
      const region = regionOf(lead.country);
      const wanted = String(rule.value).toUpperCase().split("/");
      return wanted.includes(region.toUpperCase());
    }
    case "tier":
      return tier === rule.value;
    case "source":
      return lead.source === rule.value;
  }
}

/**
 * Route leads in the order they arrived. The first enabled rule that matches wins.
 * "Round-robin" pools hand out reps in turn, so the result depends on earlier leads;
 * that is why this works on the whole list at once. Flagged leads (spam) are never assigned.
 */
export function routeLeads(
  leads: Lead[],
  tiers: Map<string, Tier>,
  skip: Set<string>,
  rules: Rule[],
  reps: Rep[] = REPS,
): Map<string, RouteResult> {
  const out = new Map<string, RouteResult>();
  const turns = new Map<string, number>();
  const ordered = [...leads].sort((a, b) => (a.receivedAt < b.receivedAt ? -1 : a.receivedAt > b.receivedAt ? 1 : a.id < b.id ? -1 : 1));
  for (const lead of ordered) {
    if (skip.has(lead.id)) {
      out.set(lead.id, { ruleId: null, ruleName: "Flagged", owner: UNASSIGNED, nurture: false, explanation: "Flagged as spam, so it is not assigned to anyone." });
      continue;
    }
    const tier = tiers.get(lead.id) ?? "cold";
    const rule = rules.find((r) => r.enabled && ruleMatches(r, lead, tier));
    if (!rule) {
      out.set(lead.id, { ruleId: null, ruleName: "No rule matched", owner: UNASSIGNED, nurture: false, explanation: "No enabled rule matched, so a rep needs to pick an owner." });
      continue;
    }
    const t = rule.target;
    let owner: string;
    if (t.kind === "nurture") owner = NURTURE_LABEL;
    else if (t.kind === "rep") owner = t.rep;
    else {
      const pool = reps.filter((r) => r.role === t.role);
      const n = turns.get(rule.id) ?? 0;
      turns.set(rule.id, n + 1);
      owner = pool.length ? pool[n % pool.length].name : UNASSIGNED;
    }
    out.set(lead.id, { ruleId: rule.id, ruleName: rule.name, owner, nurture: t.kind === "nurture", explanation: `Matched rule "${rule.name}" (${describeRule(rule)}) so it goes to ${owner}.` });
  }
  return out;
}
