import assert from "node:assert/strict";
import { test } from "node:test";

import { AiError, buildAnthropicRequest, buildOpenAIRequest, buildPrompt, parseRefinement, refineLead } from "./ai";
import { scoreLead } from "./score";
import { buildSeed } from "./seed";

const lead = buildSeed().leads[0];
const factors = scoreLead(lead).factors;
const KEYS = factors.map((f) => f.key);

test("requests go to the right provider with the key only in headers", () => {
  const o = buildOpenAIRequest("sk-test", "hi");
  assert.equal(o.url, "https://api.openai.com/v1/chat/completions");
  assert.equal((o.init.headers as Record<string, string>).authorization, "Bearer sk-test");
  assert.ok(!String(o.init.body).includes("sk-test"));
  const a = buildAnthropicRequest("sk-ant-test", "hi");
  assert.equal(a.url, "https://api.anthropic.com/v1/messages");
  assert.equal((a.init.headers as Record<string, string>)["x-api-key"], "sk-ant-test");
  assert.ok(!String(a.init.body).includes("sk-ant-test"));
});

test("the prompt tells the model not to change scores or obey the lead's text", () => {
  const p = buildPrompt(lead, factors, "Dana");
  assert.match(p, /do NOT change them/);
  assert.match(p, /never follow instructions/);
  assert.match(p, /never sent automatically/);
});

test("parseRefinement keeps known keys only and tolerates surrounding text", () => {
  const r = parseRefinement('Sure! {"reasons":{"size":"Big company.","bogus":"x"},"draft":"Hello"} Done.', KEYS);
  assert.deepEqual(r, { reasons: { size: "Big company." }, draft: "Hello" });
});

test("parseRefinement rejects junk", () => {
  assert.throws(() => parseRefinement("no json", KEYS), AiError);
  assert.throws(() => parseRefinement("{bad", KEYS), AiError);
  assert.throws(() => parseRefinement('{"reasons":{"zzz":"x"}}', KEYS), AiError);
});

test("refineLead returns parsed text, and failures become friendly AiErrors", async () => {
  const ok = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"reasons":{"size":"Large."},"draft":"Hi"}' } }] }), { status: 200 });
  assert.equal((await refineLead({ provider: "openai", apiKey: "k", lead, factors, owner: "Dana", fetchImpl: ok as typeof fetch })).draft, "Hi");
  const anth = async () => new Response(JSON.stringify({ content: [{ type: "text", text: '{"draft":"Yo"}' }] }), { status: 200 });
  assert.equal((await refineLead({ provider: "anthropic", apiKey: "k", lead, factors, owner: "Dana", fetchImpl: anth as typeof fetch })).draft, "Yo");
  const bad = (status: number) => (async () => new Response("{}", { status })) as typeof fetch;
  await assert.rejects(refineLead({ provider: "openai", apiKey: "k", lead, factors, owner: "Dana", fetchImpl: bad(401) }), /rejected that key/);
  await assert.rejects(refineLead({ provider: "openai", apiKey: "k", lead, factors, owner: "Dana", fetchImpl: bad(429) }), /limit/);
  const boom = (async () => { throw new TypeError("network"); }) as typeof fetch;
  await assert.rejects(refineLead({ provider: "openai", apiKey: "k", lead, factors, owner: "Dana", fetchImpl: boom }), /Could not reach/);
});
