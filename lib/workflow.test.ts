import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeAll } from "./analyze";
import { draftReply } from "./draft";
import { deserialize, serialize, STALE_AFTER_MS, STORAGE_KEY } from "./persist";
import { buildSeed } from "./seed";
import { computeStats, median } from "./stats";
import { formatDuration, slaFor, SLA_MINUTES } from "./time";
import { addLead, approve, disqualify, markContacted, mergeDuplicate, override, reopen, setDraft, validateNewLead, type NewLeadInput } from "./workflow";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const later = (m: number) => new Date(NOW.getTime() + m * 60000);
const fresh = () => {
  const s = buildSeed(NOW);
  return { s, a: analyzeAll(s, NOW) };
};

test("nothing is approved, sent or changed until a rep acts", () => {
  const { s } = fresh();
  assert.equal(s.leads.find((l) => l.id === "lead-01")!.status, "new");
  assert.equal(s.leads.find((l) => l.id === "lead-01")!.firstTouchAt, null);
});

test("approve sets status and writes who/what/when to the log", () => {
  const { s, a } = fresh();
  const next = approve(s, "lead-01", NOW, a);
  assert.equal(next.leads.find((l) => l.id === "lead-01")!.status, "approved");
  assert.equal(next.log[0].actor, "Dana");
  assert.match(next.log[0].text, /Approved Avery Brooks as Hot, owner Dana/);
  assert.equal(next.log[0].at, NOW.toISOString());
  assert.equal(approve(next, "lead-01", NOW, a).log.length, next.log.length); // idempotent
});

test("override needs a reason and an actual change", () => {
  const { s, a } = fresh();
  assert.equal(override(s, "lead-08", { tier: "hot", owner: null, reason: "  " }, NOW, a), s);
  assert.equal(override(s, "lead-08", { tier: "warm", owner: "Oliver", reason: "same" }, NOW, a), s);
  const next = override(s, "lead-08", { tier: "hot", owner: "Dana", reason: "Referred by a customer" }, NOW, a);
  const l = next.leads.find((x) => x.id === "lead-08")!;
  assert.equal(l.status, "approved");
  assert.deepEqual(l.override, { tier: "hot", owner: "Dana", reason: "Referred by a customer" });
  const a2 = analyzeAll(next, NOW).get("lead-08")!;
  assert.equal(a2.tier, "hot");
  assert.equal(a2.owner, "Dana");
  assert.equal(a2.score.tier, "warm"); // the AI suggestion itself is unchanged
  assert.match(next.log[0].text, /Reason: Referred by a customer/);
});

test("disqualify requires a reason; reopen undoes it", () => {
  const { s } = fresh();
  assert.equal(disqualify(s, "lead-14", "", NOW), s);
  const d = disqualify(s, "lead-14", "Spam", NOW);
  assert.equal(d.leads.find((l) => l.id === "lead-14")!.status, "disqualified");
  const r = reopen(d, "lead-14", NOW);
  assert.equal(r.leads.find((l) => l.id === "lead-14")!.status, "new");
});

test("merging a duplicate closes it and points at the original", () => {
  const { s } = fresh();
  const m = mergeDuplicate(s, "lead-02", "lead-01", NOW);
  const l = m.leads.find((x) => x.id === "lead-02")!;
  assert.equal(l.status, "disqualified");
  assert.match(l.decisionReason!, /merged into Avery Brooks/);
});

test("speed-to-lead: timer runs until the rep marks the first reply", () => {
  const { s } = fresh();
  const lead = s.leads.find((l) => l.id === "lead-01")!;
  assert.equal(slaFor(lead, later(0), false).state, "waiting-ok");
  assert.equal(slaFor(lead, later(10), false).state, "waiting-late");
  const t = markContacted(s, "lead-01", later(3), );
  const touched = t.leads.find((l) => l.id === "lead-01")!;
  assert.ok(touched.firstTouchAt);
  // seeded lead-01 arrived 2 minutes before NOW, so a reply 3 minutes after NOW took 5 minutes
  assert.equal(slaFor(touched, later(60), false).state, "met");
  assert.equal(markContacted(t, "lead-01", later(9)), t);
});

test("SLA is not applicable to spam or disqualified leads", () => {
  const { s } = fresh();
  assert.equal(slaFor(s.leads.find((l) => l.id === "lead-14")!, NOW, true).state, "none");
  assert.equal(slaFor(s.leads.find((l) => l.id === "lead-13")!, NOW, false).state, "none");
  assert.equal(SLA_MINUTES, 5);
});

test("formatDuration", () => {
  assert.deepEqual([0.2, 5, 59, 60, 135, 60 * 26].map(formatDuration), ["under 1m", "5m", "59m", "1h", "2h 15m", "1d 2h"]);
});

test("median", () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 10]), 2.5);
});

test("stats: tiers, statuses, average score, median first touch, per-rep load", () => {
  const { s, a } = fresh();
  const st = computeStats(s.leads, a);
  assert.equal(st.total, 14);
  assert.equal(st.byTier.hot + st.byTier.warm + st.byTier.cold, 13); // spam excluded
  assert.deepEqual(st.byStatus, { new: 10, approved: 3, disqualified: 1 });
  assert.equal(st.medianFirstTouchMin, 12.5); // 3 and 22 minutes
  assert.ok(st.avgScore! > 40 && st.avgScore! < 80);
  assert.ok(st.load.find((x) => x.owner === "Dana")!.count >= 3);
  assert.ok(!st.load.some((x) => x.owner === "Unassigned"));
  assert.equal(st.flagged, 2);
});

test("adding a lead validates input, scores it live and lists it first", () => {
  const { s } = fresh();
  const input: NewLeadInput = { firstName: "Ana", lastName: "Test", email: "ana@acme-demo.test", company: "Acme Demo", title: "CEO", employees: 700, industry: "Software", country: "US", source: "web form", message: "We need a replacement, we are losing deals. Budget approved, I decide, asap." };
  assert.equal(validateNewLead(input), null);
  assert.ok(validateNewLead({ ...input, email: "nope" }));
  assert.ok(validateNewLead({ ...input, firstName: " " }));
  assert.equal(addLead(s, { ...input, email: "nope" }, NOW), s);
  const next = addLead(s, input, NOW);
  assert.equal(next.leads.length, 15);
  const l = next.leads[0];
  assert.equal(l.status, "new");
  assert.equal(analyzeAll(next, NOW).get(l.id)!.score.tier, "hot");
  assert.match(next.log[0].text, /Added lead Ana Test/);
});

test("draft reply is personal, editable, and never sent", () => {
  const { s, a } = fresh();
  const hot = a.get("lead-01")!;
  assert.match(hot.draft, /^Hi Avery,/);
  assert.match(hot.draft, /20 minute call/);
  assert.match(hot.draft, /Dana$/);
  const cold = a.get("lead-12")!;
  assert.match(cold.draft, /No pressure/);
  const edited = setDraft(s, "lead-01", "My own words");
  assert.equal(analyzeAll(edited, NOW).get("lead-01")!.draft, "My own words");
  assert.ok(draftReply(s.leads[0], "warm", "Dana", "Dana").includes("short call next week"));
});

test("persistence round-trips and ignores bad data", () => {
  const { s } = fresh();
  const back = deserialize(serialize(s, NOW), NOW)!;
  assert.deepEqual(back, s);
  assert.equal(deserialize(null), null);
  assert.equal(deserialize("{not json"), null);
  assert.equal(deserialize(JSON.stringify({ version: 99, leads: [], log: [] })), null);
  assert.ok(STORAGE_KEY.includes("lead-desk"));
});

test("an API key can never end up in saved state", () => {
  const { s } = fresh();
  const dirty = { ...s, apiKey: "sk-secret", settings: { ...s.settings, apiKey: "sk-secret" } } as unknown as typeof s;
  assert.ok(!serialize(dirty, NOW).includes("sk-secret"));
});

test("reopening after a long gap shifts times so timers do not look ancient", () => {
  const { s } = fresh();
  const raw = serialize(s, NOW);
  const gap = STALE_AFTER_MS + 3 * 3600000;
  const back = deserialize(raw, new Date(NOW.getTime() + gap))!;
  const l = back.leads.find((x) => x.id === "lead-01")!;
  assert.equal(new Date(l.receivedAt).getTime(), new Date(s.leads[0].receivedAt).getTime() + gap);
  const short = deserialize(raw, later(5))!;
  assert.equal(short.leads[0].receivedAt, s.leads[0].receivedAt);
});
