import assert from "node:assert/strict";
import { test } from "node:test";

import { authorityFactor, budgetFactor, engagementFactor, needFactor, scoreLead, seniorityFactor, tierFor, timelineFactor } from "./score";

const base = { employees: 1000, industry: "Software", country: "US", title: "CEO", message: "", engagement: { pageViews: 0, pricingViewed: false, demoRequested: false, emailOpens: 0 } };

test("tier thresholds: 70 hot, 40 warm, below cold", () => {
  assert.equal(tierFor(100), "hot");
  assert.equal(tierFor(70), "hot");
  assert.equal(tierFor(69), "warm");
  assert.equal(tierFor(40), "warm");
  assert.equal(tierFor(39), "cold");
  assert.equal(tierFor(0), "cold");
});

test("a perfect ICP lead with no message scores the ICP maximum of 50", () => {
  const r = scoreLead(base);
  assert.equal(r.total, 50);
  assert.equal(r.tier, "warm");
});

test("every factor has points within its max and a plain-English reason", () => {
  const r = scoreLead({ ...base, message: "We need a fix, we are struggling with manual work asap, budget approved, I decide.", engagement: { pageViews: 9, pricingViewed: true, demoRequested: true, emailOpens: 3 } });
  assert.equal(r.factors.length, 9);
  for (const f of r.factors) {
    assert.ok(f.points >= 0 && f.points <= f.max, f.key);
    assert.ok(f.reason.length > 10, f.key);
  }
  assert.equal(r.total, 100);
  assert.equal(r.total, r.factors.reduce((s, f) => s + f.points, 0));
});

test("scoring is deterministic", () => {
  assert.deepEqual(scoreLead(base), scoreLead({ ...base }));
});

test("company size bands", () => {
  const pts = (employees: number | null) => scoreLead({ ...base, employees }).factors.find((f) => f.key === "size")!.points;
  assert.deepEqual([pts(600), pts(150), pts(30), pts(8), pts(2), pts(null)], [15, 12, 8, 4, 1, 3]);
});

test("region: US/CA/UK full marks, EU partial, rest none", () => {
  const pts = (country: string) => scoreLead({ ...base, country }).factors.find((f) => f.key === "region")!.points;
  assert.deepEqual([pts("US"), pts("CA"), pts("GB"), pts("DE"), pts("IN")], [10, 10, 10, 4, 0]);
});

test("job title seniority", () => {
  const pts = (t: string) => seniorityFactor(t).points;
  assert.deepEqual([pts("Chief Revenue Officer"), pts("Founder"), pts("VP Operations"), pts("Head of Sales"), pts("Sales Ops Manager"), pts("Analyst"), pts("Student"), pts("")], [15, 15, 12, 12, 8, 4, 0, 3]);
});

test("BANT: budget", () => {
  assert.equal(budgetFactor("Budget is approved for Q3").points, 10);
  assert.equal(budgetFactor("We have $20k set aside").points, 10);
  assert.equal(budgetFactor("Can you send pricing?").points, 5);
  assert.equal(budgetFactor("Hello").points, 0);
});

test("BANT: authority", () => {
  assert.equal(authorityFactor("I decide on tooling").points, 10);
  assert.equal(authorityFactor("I will recommend it to my boss").points, 5);
  assert.equal(authorityFactor("Hi").points, 0);
});

test("BANT: need", () => {
  assert.equal(needFactor("We are struggling with manual spreadsheets").points, 10);
  assert.equal(needFactor("We need a tool").points, 6);
  assert.equal(needFactor("Just looking").points, 2);
  assert.equal(needFactor("Hello there").points, 0);
});

test("BANT: timeline, and 'no rush' beats nothing but loses to urgency", () => {
  assert.equal(timelineFactor("We need it asap").points, 10);
  assert.equal(timelineFactor("Hoping to start next quarter").points, 6);
  assert.equal(timelineFactor("No rush at all").points, 1);
  assert.equal(timelineFactor("Hello").points, 0);
});

test("engagement is capped at 10", () => {
  assert.equal(engagementFactor({ pageViews: 50, pricingViewed: true, demoRequested: true, emailOpens: 9 }).points, 10);
  assert.equal(engagementFactor({ pageViews: 0, pricingViewed: false, demoRequested: false, emailOpens: 0 }).points, 0);
  assert.equal(engagementFactor({ pageViews: 3, pricingViewed: false, demoRequested: false, emailOpens: 0 }).points, 1);
});

test("a weak lead lands in Cold", () => {
  const r = scoreLead({ employees: 2, industry: "Hobby", country: "BR", title: "Student", message: "just looking", engagement: { pageViews: 1, pricingViewed: false, demoRequested: false, emailOpens: 0 } });
  assert.equal(r.tier, "cold");
  assert.ok(r.total < 40);
});
