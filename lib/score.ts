import { countryName, regionOf } from "./regions";
import type { Engagement, Factor, Lead, ScoreResult, Tier } from "./types";

export const HOT_MIN = 70;
export const WARM_MIN = 40;

export function tierFor(total: number): Tier {
  return total >= HOT_MIN ? "hot" : total >= WARM_MIN ? "warm" : "cold";
}

const TARGET_INDUSTRIES = ["software", "saas", "fintech", "healthcare", "e-commerce", "ecommerce", "logistics", "cybersecurity", "marketing technology"];
const ADJACENT_INDUSTRIES = ["consulting", "media", "education", "manufacturing", "retail", "telecom", "real estate", "financial services"];

function sizeFactor(employees: number | null): Factor {
  let points: number;
  let reason: string;
  if (employees === null) [points, reason] = [3, "Company size not given, so a small default."];
  else if (employees >= 500) [points, reason] = [15, `${employees} employees: enterprise, our best-fit size.`];
  else if (employees >= 100) [points, reason] = [12, `${employees} employees: mid-market, a strong fit.`];
  else if (employees >= 20) [points, reason] = [8, `${employees} employees: a small business, a decent fit.`];
  else if (employees >= 5) [points, reason] = [4, `${employees} employees: very small, limited budget likely.`];
  else [points, reason] = [1, `${employees} employee(s): too small for our product.`];
  return { key: "size", group: "icp", label: "Company size", points, max: 15, reason };
}

function industryFactor(industry: string): Factor {
  const i = industry.trim().toLowerCase();
  let points = 2;
  let reason = `${industry || "Unknown industry"} is outside the industries we usually win in.`;
  if (TARGET_INDUSTRIES.some((t) => i.includes(t))) [points, reason] = [10, `${industry} is one of our target industries.`];
  else if (ADJACENT_INDUSTRIES.some((t) => i.includes(t))) [points, reason] = [5, `${industry} is adjacent to our target industries.`];
  return { key: "industry", group: "icp", label: "Industry", points, max: 10, reason };
}

function regionFactor(country: string): Factor {
  const r = regionOf(country);
  const name = countryName(country);
  if (r === "US" || r === "CA" || r === "UK") return { key: "region", group: "icp", label: "Region", points: 10, max: 10, reason: `${name} is a market we sell into directly.` };
  if (r === "EU") return { key: "region", group: "icp", label: "Region", points: 4, max: 10, reason: `${name} is outside our core markets (US, UK, Canada) but reachable.` };
  return { key: "region", group: "icp", label: "Region", points: 0, max: 10, reason: `${name || "Unknown country"} is outside the markets we serve.` };
}

export function seniorityFactor(title: string): Factor {
  const t = title.toLowerCase();
  let points = 3;
  let reason = `"${title || "No title"}" is an individual-contributor or unclear role.`;
  if (/\b(intern|student|trainee)\b/.test(t)) [points, reason] = [0, `"${title}" has no buying power.`];
  else if (/\b(ceo|cto|cfo|coo|cio|cmo|cro|chief|founder|co-founder|owner|president|managing director)\b/.test(t)) [points, reason] = [15, `"${title}" is a top decision maker.`];
  else if (/\b(vp|vice president|head of|director)\b/.test(t)) [points, reason] = [12, `"${title}" is a senior leader who can sponsor a purchase.`];
  else if (/\b(manager|lead|principal)\b/.test(t)) [points, reason] = [8, `"${title}" is a manager who influences the decision.`];
  else if (/\b(senior|sr|analyst|specialist|engineer|coordinator)\b/.test(t)) [points, reason] = [4, `"${title}" is hands-on; may need to bring in a boss.`];
  return { key: "seniority", group: "icp", label: "Job title", points, max: 15, reason };
}

type Band = { re: RegExp; points: number; reason: string };

function band(text: string, bands: Band[], none: string): { points: number; reason: string } {
  for (const b of bands) {
    const m = text.match(b.re);
    if (m) return { points: b.points, reason: b.reason.replace("{m}", m[0].trim()) };
  }
  return { points: 0, reason: none };
}

export function budgetFactor(msg: string): Factor {
  const r = band(
    msg.toLowerCase(),
    [
      { re: /budget (is )?(approved|signed|allocated|set|secured)|approved budget|have (a )?budget|funding|[$£]\s?\d[\d,.]*\s?k?/, points: 10, reason: 'Mentions money or an approved budget ("{m}").' },
      { re: /budget|pricing|quote|price|cost|how much|purchase order/, points: 5, reason: 'Asks about cost ("{m}") but no figure or approval yet.' },
    ],
    "No mention of budget or pricing.",
  );
  return { key: "budget", group: "bant", label: "Budget", max: 10, ...r };
}

export function authorityFactor(msg: string): Factor {
  const r = band(
    msg.toLowerCase(),
    [
      { re: /i decide|i sign|sign[- ]off|decision[- ]maker|i own|i'm responsible|i am responsible|my call|i run|we're choosing|i lead/, points: 10, reason: 'Says they decide ("{m}").' },
      { re: /recommend|evaluat|my (boss|manager|director|vp|ceo|cto)|shortlist|our team|we are looking|we're looking|researching for/, points: 5, reason: 'Part of a buying group ("{m}").' },
    ],
    "Does not say who makes the decision.",
  );
  return { key: "authority", group: "bant", label: "Authority", max: 10, ...r };
}

export function needFactor(msg: string): Factor {
  const m = msg.toLowerCase();
  const hits = m.match(/\b(need|struggl\w*|replac\w*|pain|too slow|manual\w*|losing|problem|migrat\w*|churn|spreadsheets?|missing|can't|cannot|outgrown|slipping)\b/g) ?? [];
  const curious = /\b(curious|just looking|just exploring|browsing|no particular)\b/.test(m);
  if (hits.length >= 2) return { key: "need", group: "bant", label: "Need", points: 10, max: 10, reason: `Describes a clear problem (${[...new Set(hits)].slice(0, 3).join(", ")}).` };
  if (hits.length === 1) return { key: "need", group: "bant", label: "Need", points: 6, max: 10, reason: `Hints at a need ("${hits[0]}") without much detail.` };
  if (curious) return { key: "need", group: "bant", label: "Need", points: 2, max: 10, reason: "Sounds like casual browsing rather than a problem to solve." };
  return { key: "need", group: "bant", label: "Need", points: 0, max: 10, reason: "No problem or goal described." };
}

export function timelineFactor(msg: string): Factor {
  const r = band(
    msg.toLowerCase(),
    [
      { re: /no rush|someday|eventually|next year|no timeline|just looking|not urgent/, points: 1, reason: 'Far off or no urgency ("{m}").' },
      { re: /asap|this week|immediately|urgent|today|tomorrow|this month|next month|by (the )?end of (the )?(month|q\d)|within \d+ (days|weeks)|this quarter|before (the )?(end|launch|renewal)/, points: 10, reason: 'Wants to move soon ("{m}").' },
      { re: /next quarter|this year|few months|\bq[1-4]\b|in \d+ months|later this/, points: 6, reason: 'Has a rough timeframe ("{m}").' },
    ],
    "No timeline given.",
  );
  return { key: "timeline", group: "bant", label: "Timeline", max: 10, ...r };
}

export function engagementFactor(e: Engagement): Factor {
  let points = 0;
  const parts: string[] = [];
  if (e.demoRequested) (points += 4), parts.push("asked for a demo");
  if (e.pricingViewed) (points += 3), parts.push("viewed pricing");
  if (e.pageViews >= 5) (points += 2), parts.push(`${e.pageViews} page views`);
  else if (e.pageViews >= 2) (points += 1), parts.push(`${e.pageViews} page views`);
  if (e.emailOpens >= 1) (points += 1), parts.push("opened our email");
  points = Math.min(10, points);
  return { key: "engagement", group: "engagement", label: "Engagement", points, max: 10, reason: parts.length ? `${cap(parts.join(", "))}.` : "No activity on our site or email yet." };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Score a lead 0-100. Deterministic: the same lead always gets the same score. */
export function scoreLead(lead: Pick<Lead, "employees" | "industry" | "country" | "title" | "message" | "engagement">): ScoreResult {
  const factors = [
    sizeFactor(lead.employees),
    industryFactor(lead.industry),
    regionFactor(lead.country),
    seniorityFactor(lead.title),
    budgetFactor(lead.message),
    authorityFactor(lead.message),
    needFactor(lead.message),
    timelineFactor(lead.message),
    engagementFactor(lead.engagement),
  ];
  const total = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)));
  return { total, tier: tierFor(total), factors };
}
