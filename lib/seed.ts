import { DEFAULT_RULES } from "./routing";
import type { AppState, Engagement, Lead, LogEntry, Source } from "./types";

type Seed = {
  id: string; ago: number; first: string; last: string; email: string; company: string; title: string; employees: number | null;
  industry: string; country: string; source: Source; message: string; eng: Partial<Engagement>;
  status?: Lead["status"]; touchAfter?: number; reason?: string;
};

const SEEDS: Seed[] = [
  { id: "lead-01", ago: 2, first: "Avery", last: "Brooks", email: "avery.brooks@northwind-freight.example", company: "Northwind Freight Demo Co", title: "VP Operations", employees: 1200, industry: "Logistics", country: "US", source: "demo request",
    message: "We need to replace our spreadsheets for routing inbound leads. Budget is approved for this quarter and I sign off on new tools. Could we get a demo this week?", eng: { pageViews: 9, pricingViewed: true, demoRequested: true, emailOpens: 1 } },
  { id: "lead-02", ago: 1, first: "Avery", last: "Brooks", email: "avery.brooks@northwind-freight.example", company: "Northwind Freight Demo Co", title: "VP Operations", employees: 1200, industry: "Logistics", country: "US", source: "chat",
    message: "Following up on my demo request, we need this asap.", eng: { pageViews: 3 } },
  { id: "lead-03", ago: 4, first: "Priya", last: "Nair", email: "priya.nair@orbitcloud.example", company: "Orbit Cloud Demo Inc", title: "Chief Revenue Officer", employees: 3000, industry: "Software", country: "US", source: "demo request",
    message: "We are struggling with a legacy lead router and losing deals to slow follow-up. Budget of $250k is approved and I decide. We want to go live within 6 weeks.", eng: { pageViews: 12, pricingViewed: true, demoRequested: true, emailOpens: 2 } },
  { id: "lead-04", ago: 12, first: "Imogen", last: "Clarke", email: "imogen.clarke@brightwater-demo.example", company: "Brightwater Software Demo Ltd", title: "Head of Sales", employees: 240, industry: "SaaS", country: "GB", source: "web form",
    message: "Our team is struggling with slow follow-up and we are missing leads. We are looking at pricing and want to be live next month.", eng: { pageViews: 6, pricingViewed: true } },
  { id: "lead-05", ago: 58, first: "Marcus", last: "Tran", email: "marcus.tran@pinecrest-pay.example", company: "Pinecrest Payments Demo", title: "CTO", employees: 85, industry: "Fintech", country: "CA", source: "chat",
    message: "We need to cut manual lead triage. I decide on tooling and have a budget around $20k. Hoping to start this quarter.", eng: { pageViews: 7, pricingViewed: true, emailOpens: 1 }, status: "approved", touchAfter: 3 },
  { id: "lead-06", ago: 95, first: "Sofia", last: "Delgado", email: "sofia.delgado@harborhealth-demo.example", company: "Harbor Health Demo Group", title: "Sales Ops Manager", employees: 600, industry: "Healthcare", country: "US", source: "web form",
    message: "Evaluating tools for our team. Can you send pricing? We expect to decide later this year.", eng: { pageViews: 4, pricingViewed: true }, status: "approved", touchAfter: 22 },
  { id: "lead-07", ago: 30, first: "Liam", last: "Fraser", email: "liam.fraser@mapleridge-demo.example", company: "Maple Ridge Software Demo", title: "Director of Revenue", employees: 150, industry: "Software", country: "CA", source: "demo request",
    message: "Duplicate leads are a real problem for us and we need a fix before Q2. Budget is set and we have a shortlist.", eng: { pageViews: 5, demoRequested: true }, status: "approved" },
  { id: "lead-08", ago: 45, first: "Gareth", last: "Hughes", email: "gareth.hughes@dragonstone-demo.example", company: "Dragon Stone Logistics Demo", title: "Operations Manager", employees: 90, industry: "Logistics", country: "GB", source: "web form",
    message: "We have a problem with manual lead handling. Looking at pricing, perhaps next quarter.", eng: { pageViews: 3, emailOpens: 1 } },
  { id: "lead-09", ago: 130, first: "Nina", last: "Kowalski", email: "nina.kowalski@quillstone-demo.example", company: "Quillstone Analytics Demo", title: "Product Lead", employees: 28, industry: "SaaS", country: "IN", source: "web form",
    message: "We need lead scoring. Exploring options for later this year.", eng: { pageViews: 2 } },
  { id: "lead-10", ago: 210, first: "Ben", last: "Okafor", email: "ben@tidycrate-demo.example", company: "Tidy Crate Demo", title: "Founder", employees: 12, industry: "E-commerce", country: "US", source: "event list",
    message: "Met your team at the event. Interested in a quote, no rush.", eng: { pageViews: 1, emailOpens: 1 } },
  { id: "lead-11", ago: 300, first: "Hannah", last: "Weiss", email: "hannah.weiss@lumenretail-demo.example", company: "Lumen Retail Demo Group", title: "Marketing Specialist", employees: 300, industry: "Retail", country: "DE", source: "web form",
    message: "Curious how this works.", eng: { pageViews: 1 } },
  { id: "lead-12", ago: 380, first: "Chloe", last: "Evans", email: "chloe.evans@greenfield-edu.example", company: "Greenfield Education Demo", title: "Analyst", employees: 40, industry: "Education", country: "GB", source: "chat",
    message: "Just looking, no rush.", eng: { pageViews: 1 } },
  { id: "lead-13", ago: 520, first: "Tom", last: "Reilly", email: "tom.reilly@campus-demo.example", company: "Campus Project Demo", title: "Student", employees: 1, industry: "Education", country: "US", source: "event list",
    message: "Student researching CRMs for a class project.", eng: { pageViews: 1 }, status: "disqualified", reason: "Student project, no buying power." },
  { id: "lead-14", ago: 8, first: "asdfgh", last: "qwerty", email: "asdfgh1234@gmail.com", company: "sdkjhfksjdhf", title: "", employees: null, industry: "", country: "US", source: "web form",
    message: "test test lorem ipsum", eng: {} },
];

export function buildSeed(now: Date = new Date()): AppState {
  const at = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60000).toISOString();
  const log: LogEntry[] = [];
  const leads: Lead[] = SEEDS.map((s) => {
    const receivedAt = at(s.ago);
    const touched = s.touchAfter !== undefined ? new Date(new Date(receivedAt).getTime() + s.touchAfter * 60000).toISOString() : null;
    const status = s.status ?? "new";
    if (status !== "new") log.push({ id: `log-${s.id}`, at: touched ?? at(Math.max(1, s.ago - 5)), actor: "Dana", leadId: s.id, text: status === "approved" ? `Approved ${s.first} ${s.last}.` : `Disqualified ${s.first} ${s.last}. Reason: ${s.reason}` });
    return {
      id: s.id, firstName: s.first, lastName: s.last, email: s.email, company: s.company, title: s.title, employees: s.employees,
      industry: s.industry, country: s.country, source: s.source, message: s.message, receivedAt,
      engagement: { pageViews: 0, pricingViewed: false, demoRequested: false, emailOpens: 0, ...s.eng },
      status, firstTouchAt: touched, override: null, decisionReason: s.reason ?? null, draftEdit: null, ai: null,
    };
  });
  log.sort((a, b) => (a.at < b.at ? 1 : -1));
  return { leads, log, settings: { rules: DEFAULT_RULES.map((r) => ({ ...r })), actor: "Dana" } };
}
