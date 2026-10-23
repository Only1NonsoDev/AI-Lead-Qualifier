import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeAll } from "./analyze";
import { buildCsv, csvCell, exportableLeads, HUBSPOT_COLUMNS, SALESFORCE_COLUMNS, toCsv } from "./export";
import { buildSeed } from "./seed";

const NOW = new Date("2026-06-01T12:00:00.000Z");

test("csvCell quotes commas, quotes and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
  assert.equal(csvCell(42), "42");
});

test("csvCell neutralises spreadsheet formulas", () => {
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell("+1 555"), "'+1 555");
  assert.equal(csvCell("@cmd"), "'@cmd");
});

test("toCsv uses CRLF and a trailing newline", () => {
  assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), 'a,b\r\n1,"x,y"\r\n');
});

test("only approved leads are exported", () => {
  const s = buildSeed(NOW);
  const ids = exportableLeads(s.leads).map((l) => l.id);
  assert.deepEqual(ids, ["lead-05", "lead-06", "lead-07"]);
});

test("HubSpot CSV has the required columns in order, and the right values", () => {
  const s = buildSeed(NOW);
  const csv = buildCsv("hubspot", s.leads, analyzeAll(s, NOW));
  const [head, ...rows] = csv.trim().split("\r\n");
  assert.equal(head, "First Name,Last Name,Email,Company Name,Job Title,Lifecycle Stage,Lead Status,HubSpot Owner,Lead Score");
  assert.deepEqual(head.split(","), HUBSPOT_COLUMNS);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /^Marcus,Tran,marcus\.tran@pinecrest-pay\.example,Pinecrest Payments Demo,CTO,salesqualifiedlead,OPEN,\w+,\d+$/);
  assert.match(rows[1], /Sofia.*marketingqualifiedlead,NEW,Dana,\d+$/);
});

test("Salesforce CSV uses Salesforce-style columns", () => {
  const s = buildSeed(NOW);
  const csv = buildCsv("salesforce", s.leads, analyzeAll(s, NOW));
  assert.deepEqual(csv.split("\r\n")[0].split(","), SALESFORCE_COLUMNS);
  assert.match(csv, /Maple Ridge Software Demo/);
});

test("nurture and unassigned owners export as blank, and overrides win", () => {
  let s = buildSeed(NOW);
  s = { ...s, leads: s.leads.map((l) => (l.id === "lead-09" ? { ...l, status: "approved" as const } : l.id === "lead-05" ? { ...l, override: { tier: "warm" as const, owner: "Oliver", reason: "Prefers UK hours" } } : l)) };
  const lines = buildCsv("hubspot", s.leads, analyzeAll(s, NOW)).trim().split("\r\n");
  const nina = lines.find((l) => l.startsWith("Nina"))!;
  assert.match(nina, /,lead,NEW,,\d+$/);
  const marcus = lines.find((l) => l.startsWith("Marcus"))!;
  assert.match(marcus, /marketingqualifiedlead,NEW,Oliver,/);
});

test("with nothing approved, only the header is written", () => {
  const s = buildSeed(NOW);
  const none = { ...s, leads: s.leads.map((l) => ({ ...l, status: "new" as const })) };
  assert.equal(buildCsv("generic", none.leads, analyzeAll(none, NOW)).trim().split("\r\n").length, 1);
});
