import { emailDomain } from "./regions";
import type { Lead } from "./types";

export const FREE_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "proton.me", "protonmail.com", "gmx.com", "live.com"];
export const DISPOSABLE_DOMAINS = ["mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "trashmail.com", "yopmail.com", "throwawaymail.com", "sharklasers.com"];

export const isFreeEmail = (email: string) => FREE_EMAIL_DOMAINS.includes(emailDomain(email));
export const isDisposable = (email: string) => DISPOSABLE_DOMAINS.includes(emailDomain(email));

const TEST_TEXT = /\b(test(ing)?|asdf+|qwerty|lorem ipsum|foo ?bar|blah( blah)?|xxx+|dummy|sample lead)\b/i;

/** True for text that looks like keyboard mashing: long consonant runs, repeated letters, or almost no vowels. */
export function looksGibberish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  if (words.length === 0) return false;
  let bad = 0;
  for (const w of words) {
    const vowels = (w.match(/[aeiouy]/g) ?? []).length;
    if (/[^aeiouy\s]{5,}/.test(w) || /(.)\1{3,}/.test(w) || vowels / w.length < 0.15) bad++;
  }
  return bad / words.length >= 0.5;
}

export type SpamResult = { isSpam: boolean; signals: string[] };

export function detectSpam(lead: Pick<Lead, "email" | "firstName" | "lastName" | "company" | "message">): SpamResult {
  const signals: string[] = [];
  let strong = 0;
  if (isDisposable(lead.email)) (strong += 1), signals.push(`Disposable email domain (${emailDomain(lead.email)}).`);
  const text = `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.message}`;
  if (TEST_TEXT.test(text)) (strong += 1), signals.push('Contains test or filler text (like "test" or "asdf").');
  const gibberish = looksGibberish(`${lead.firstName} ${lead.lastName}`) || looksGibberish(lead.company) || looksGibberish(lead.message);
  if (gibberish) signals.push("Name, company or message looks like random keystrokes.");
  const free = isFreeEmail(lead.email);
  if (free && gibberish) signals.push("Free email address combined with gibberish text.");
  if (!lead.message.trim() && free) signals.push("Free email address and an empty message.");
  const isSpam = strong > 0 || (gibberish && free) || (gibberish && !lead.message.trim()) || signals.length >= 3;
  return { isSpam, signals: isSpam ? signals : [] };
}

export type DuplicateResult = { ofId: string; reason: string } | null;

const norm = (email: string) => email.trim().toLowerCase();

/** A lead is a duplicate when an EARLIER lead shares its email, or its company web domain (free mail domains do not count). */
export function findDuplicate(lead: Lead, all: Lead[]): DuplicateResult {
  const earlier = all.filter((o) => o.id !== lead.id && (o.receivedAt < lead.receivedAt || (o.receivedAt === lead.receivedAt && o.id < lead.id)));
  const sameEmail = earlier.find((o) => norm(o.email) === norm(lead.email));
  if (sameEmail) return { ofId: sameEmail.id, reason: `Same email address as ${sameEmail.firstName} ${sameEmail.lastName} (${sameEmail.company}).` };
  const d = emailDomain(lead.email);
  if (d && !isFreeEmail(lead.email) && !isDisposable(lead.email)) {
    const sameDomain = earlier.find((o) => emailDomain(o.email) === d);
    if (sameDomain) return { ofId: sameDomain.id, reason: `Same company domain (${d}) as ${sameDomain.firstName} ${sameDomain.lastName}, who is already in the inbox.` };
  }
  return null;
}
