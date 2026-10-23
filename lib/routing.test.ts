import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_RULES, NURTURE_LABEL, routeLeads, ruleMatches, UNASSIGNED } from "./routing";
import { buildSeed } from "./seed";
import type { Lead, Rule, Tier } from "./types";

const mk = (id: string, over: Partial<Lead>): Lead => ({ ...buildSeed().leads[0], id, ...over });
const route = (leads: Lead[], tiers: Record<string, Tier>, rules: Rule[] = DEFAULT_RULES, skip: string[] = []) =>
  routeLeads(leads, new Map(Object.entries(tiers)), new Set(skip), rules);

test("enterprise (500+) goes to the Enterprise AE", () => {
  const l = mk("a", { employees: 800, country: "US" });
  const r = route([l], { a: "hot" }).get("a")!;
  assert.equal(r.owner, "Dana");
  assert.match(r.explanation, /Enterprise/);
});

test("UK and EU go to the UK rep, and rule order matters", () => {
  const uk = mk("a", { employees: 100, country: "GB" });
  const ie = mk("b", { employees: 100, country: "IE", receivedAt: "2026-01-01T00:00:01.000Z" });
  const bigUk = mk("c", { employees: 900, country: "GB", receivedAt: "2026-01-01T00:00:02.000Z" });
  const res = route([uk, ie, bigUk], { a: "warm", b: "warm", c: "warm" });
  assert.equal(res.get("a")!.owner, "Oliver");
  assert.equal(res.get("b")!.owner, "Oliver");
  assert.equal(res.get("c")!.owner, "Dana"); // enterprise rule is listed before the UK rule
});

test("SMB leads rotate round-robin through the SDRs in arrival order", () => {
  const ls = [0, 1, 2, 3].map((i) => mk(`s${i}`, { employees: 50, country: "US", receivedAt: `2026-01-01T00:00:0${i}.000Z` }));
  const res = route(ls, Object.fromEntries(ls.map((l) => [l.id, "warm" as Tier])));
  assert.deepEqual(ls.map((l) => res.get(l.id)!.owner), ["Jordan", "Riley", "Casey", "Jordan"]);
});

test("cold leads go to the nurture sequence", () => {
  const l = mk("a", { employees: 800, country: "US" });
  const r = route([l], { a: "cold" }).get("a")!;
  assert.equal(r.owner, NURTURE_LABEL);
  assert.equal(r.nurture, true);
});

test("disabled rules are skipped", () => {
  const rules = DEFAULT_RULES.map((r) => (r.id === "r-ent" ? { ...r, enabled: false } : r));
  const l = mk("a", { employees: 800, country: "US" });
  assert.equal(route([l], { a: "hot" }, rules).get("a")!.ruleId, null); // 800 employees is not SMB, so nothing else matches
  assert.notEqual(route([l], { a: "hot" }, rules).get("a")!.owner, "Dana");
});

test("no matching rule leaves the lead unassigned and says so", () => {
  const l = mk("a", { employees: 800, country: "US" });
  const r = route([l], { a: "hot" }, []).get("a")!;
  assert.equal(r.owner, UNASSIGNED);
  assert.equal(r.ruleId, null);
});

test("spam is never assigned", () => {
  const l = mk("a", { employees: 800 });
  assert.equal(route([l], { a: "hot" }, DEFAULT_RULES, ["a"]).get("a")!.owner, UNASSIGNED);
});

test("unknown company size never matches a size rule", () => {
  const rule: Rule = { id: "x", name: "x", enabled: true, field: "employees", op: "lt", value: 500, target: { kind: "nurture" } };
  assert.equal(ruleMatches(rule, { employees: null, country: "US", source: "chat" }, "warm"), false);
});

test("source and region rules", () => {
  const src: Rule = { id: "x", name: "x", enabled: true, field: "source", op: "is", value: "event list", target: { kind: "nurture" } };
  assert.ok(ruleMatches(src, { employees: 1, country: "US", source: "event list" }, "warm"));
  const reg: Rule = { id: "y", name: "y", enabled: true, field: "region", op: "is", value: "CA", target: { kind: "nurture" } };
  assert.ok(ruleMatches(reg, { employees: 1, country: "CA", source: "chat" }, "warm"));
  assert.ok(!ruleMatches(reg, { employees: 1, country: "US", source: "chat" }, "warm"));
});
