Build "Lead Desk" - an AI Lead Qualifier portfolio demo in THIS directory (/workspace/lead-qualifier).
Reference project for stack, style, code quality: /workspace/invoice-reader (read its app/, components/, lib/, globals.css, next.config.mjs, package.json, README). Copy its stack: Next.js 15 static export (output:'export'), React 19, TypeScript, plain CSS, tests with `tsx --test lib/*.test.ts`. Match its Apple Liquid Glass / glassmorphic look (frosted translucent panels, backdrop-filter blur+saturate, soft specular highlights, rounded 20px+ corners, vibrant blurred background, prefers-reduced-transparency/motion fallbacks, good contrast).

Real-world workflow (sales team, B2B SaaS selling to companies in US/UK/Canada):
- Inbound leads arrive from web form, demo request, chat, event list. Speed-to-lead matters (reply within 5 min => far higher conversion): show "waiting" timer / SLA badge per lead.
- Score = ICP fit (company size, industry, country/region, job title seniority) + BANT intent (Budget, Authority, Need, Timeline from message text) + engagement. Each factor shows points and a plain-English reason. Total 0-100 => Hot (>=70) / Warm (40-69) / Cold (<40).
- Spam/junk detection (free email + gibberish, disposable domains, test text) and duplicate detection (same email/domain as existing lead) => flagged, suggest merge/discard.
- Routing rules (editable list in a Settings panel): e.g. Enterprise (500+ employees) -> AE Enterprise rep; region UK/EU -> UK rep; SMB -> SDR round-robin; Cold -> nurture sequence. Show which rule matched.
- Human in the loop: AI only suggests. Rep must Approve, Override (change tier/owner with reason), or Disqualify. Nothing is ever sent automatically; app never contacts anyone. Clear banner saying this.
- Drafted first-reply email per lead for rep to edit, with Copy button (no send).
- Pipeline dashboard: counts by tier/status, avg score, median time-to-first-touch, per-rep load.
- Export approved leads as CSV and as HubSpot-style import CSV (columns: First Name, Last Name, Email, Company Name, Job Title, Lifecycle Stage, Lead Status, HubSpot Owner, Lead Score) and Salesforce-style column option.
- Activity log (who did what, when). State persisted in localStorage with a Reset demo button.
- Add-a-lead form (paste a new inbound lead) to score live.
- Keyless demo: deterministic rule-based scorer in lib/ works with no key. Optional bring-your-own OpenAI or Anthropic key (stored only in localStorage/session, called from browser) to refine reasons + draft reply; never ship any real key; fall back gracefully.
- 12-15 fake sample leads with obviously fictional names and example domains (e.g. @example.com, acme-demo.test style, *.example) — no real people/emails. Include 1 spam, 1 duplicate, mix of hot/warm/cold.
- Reps are fictional first names only.

UX: inbox list (left) + detail pane (right) on desktop; on phone list -> detail drill-in with back button, bottom-friendly tap targets 44px+. Keyboard shortcuts (j/k next, a approve). Filters by tier/status, search. Beginner-friendly "How it works" explainer section.

Requirements: unit tests for scoring, tiering, spam/dup detection, routing, CSV export (all passing via npm test). `npm run build` must succeed producing out/. Write README.md explaining in plain beginner language. Do not create git repos remotes, do not push, do not deploy. When done, run npm install, npm test, npm run typecheck, npm run build and fix everything until green.
