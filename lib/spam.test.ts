import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSeed } from "./seed";
import { detectSpam, findDuplicate, isDisposable, isFreeEmail, looksGibberish } from "./spam";
import type { Lead } from "./types";

const lead = (over: Partial<Lead>): Lead => ({ ...buildSeed().leads[0], ...over });
const clean = { email: "jo@acme-demo.test", firstName: "Jo", lastName: "Park", company: "Acme Demo", message: "We would like to see how lead routing works for our team." };

test("a normal business lead is not spam", () => {
  const r = detectSpam(clean);
  assert.equal(r.isSpam, false);
  assert.deepEqual(r.signals, []);
});

test("free and disposable email detection", () => {
  assert.ok(isFreeEmail("a@gmail.com"));
  assert.ok(!isFreeEmail("a@acme-demo.test"));
  assert.ok(isDisposable("x@mailinator.com"));
});

test("gibberish detection", () => {
  assert.ok(looksGibberish("sdkjhfksjdhf"));
  assert.ok(looksGibberish("asdfgh qwerty"));
  assert.ok(!looksGibberish("Northwind Freight"));
  assert.ok(!looksGibberish(""));
});

test("free email plus gibberish is spam", () => {
  const r = detectSpam({ ...clean, email: "kjh123@gmail.com", firstName: "sdfsdf", lastName: "ghjkgh", company: "xcvbnmxc", message: "hjkhjkhjk" });
  assert.equal(r.isSpam, true);
  assert.ok(r.signals.length >= 2);
});

test("a free email with a real message is NOT spam", () => {
  assert.equal(detectSpam({ ...clean, email: "jo.park@gmail.com" }).isSpam, false);
});

test("disposable domain is spam on its own", () => {
  const r = detectSpam({ ...clean, email: "jo@mailinator.com" });
  assert.equal(r.isSpam, true);
  assert.match(r.signals[0], /Disposable/);
});

test("test text is spam", () => {
  assert.equal(detectSpam({ ...clean, message: "this is a test lead lorem ipsum" }).isSpam, true);
});

test("the seed spam lead is caught and no other seed lead is", () => {
  const spam = buildSeed().leads.filter((l) => detectSpam(l).isSpam);
  assert.deepEqual(spam.map((l) => l.id), ["lead-14"]);
});

test("duplicate: same email is flagged on the LATER lead only", () => {
  const a = lead({ id: "a", email: "x@acme-demo.test", receivedAt: "2026-01-01T10:00:00.000Z" });
  const b = lead({ id: "b", email: " X@Acme-Demo.test ", receivedAt: "2026-01-01T10:05:00.000Z" });
  assert.equal(findDuplicate(a, [a, b]), null);
  const d = findDuplicate(b, [a, b]);
  assert.equal(d?.ofId, "a");
  assert.match(d!.reason, /Same email/);
});

test("duplicate: same company domain, different person", () => {
  const a = lead({ id: "a", email: "x@acme-demo.test", receivedAt: "2026-01-01T10:00:00.000Z" });
  const b = lead({ id: "b", email: "y@acme-demo.test", receivedAt: "2026-01-01T10:05:00.000Z" });
  assert.match(findDuplicate(b, [a, b])!.reason, /company domain/);
});

test("duplicate: shared free-mail domain does not count", () => {
  const a = lead({ id: "a", email: "x@gmail.com", receivedAt: "2026-01-01T10:00:00.000Z" });
  const b = lead({ id: "b", email: "y@gmail.com", receivedAt: "2026-01-01T10:05:00.000Z" });
  assert.equal(findDuplicate(b, [a, b]), null);
});

test("the seed has exactly one duplicate", () => {
  const all = buildSeed().leads;
  const dups = all.filter((l) => findDuplicate(l, all));
  assert.deepEqual(dups.map((l) => l.id), ["lead-02"]);
});
