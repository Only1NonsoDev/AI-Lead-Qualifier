# Lead Desk

A portfolio demo of an **AI lead qualifier** for a sales team. New leads arrive, the app scores them, flags junk and duplicates, suggests who should own each one and drafts a first reply. **A person makes every decision.** The app never emails or contacts anyone and never talks to a CRM.

Everything on screen is fictional: names, companies and emails use `.example` and `.test` domains. No API key is needed.

## What problem does it solve?

A B2B software company gets leads from web forms, demo requests, chat and event lists. Two things hurt sales: waiting too long to reply (replying within **5 minutes** converts far better) and spending time on the wrong leads. Lead Desk shows how long each lead has been waiting and ranks them by how likely they are to buy.

## Try it

```bash
npm install
npm run dev        # open http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm test` | Runs the unit tests (scoring, tiers, spam and duplicate detection, routing, CSV export, workflow, saving, AI parsing) |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run build` | Builds the static site into `out/` |
| `npm start` | Serves `out/` locally |

To host under a sub-path (for example GitHub Pages), build with `NEXT_PUBLIC_BASE_PATH=/lead-desk npm run build`.

## How the score works (0 to 100)

| Part | Points | Looks at |
| --- | --- | --- |
| **ICP fit** ("ideal customer profile") | 50 | Company size (15), industry (10), country (10), job title seniority (15) |
| **Buying intent (BANT)** | 40 | **B**udget, **A**uthority, **N**eed, **T**imeline, each worth 10 and read from the lead's message |
| **Engagement** | 10 | Demo request, pricing page, page views, email opens |

The total decides the tier: **Hot** is 70 or more, **Warm** is 40 to 69, **Cold** is under 40. Every factor shows its points and a plain-English reason. The scorer is ordinary code in `lib/score.ts`, so the same lead always gets the same score.

## Spam and duplicates

* **Spam**: disposable email domains, "test" or "asdf" text, keyboard-mashing names, and free email plus gibberish. Flagged leads get a "discard" suggestion and are never assigned.
* **Duplicates**: a later lead with the same email, or the same company domain, as an earlier one. The app suggests merging.

## Routing rules

In **Settings** you can edit an ordered list of rules. The first enabled rule that matches wins, and each lead shows which rule matched. The defaults:

1. Cold leads go to a nurture sequence.
2. 500 or more employees go to Dana (AE Enterprise).
3. UK or EU leads go to Oliver (AE UK).
4. Under 500 employees go to the SDRs (Jordan, Riley, Casey) in round-robin.

Reps are fictional first names.

## Human in the loop

For each lead you can **Approve** the suggestion, **Override** the tier or owner (a reason is required), or **Disqualify** (a reason is required). Everything is written to the **activity log** with who and when. Each lead also has an editable draft reply with a **Copy** button. After you send it yourself, press "I sent my reply" to stop the speed-to-lead timer.

Keyboard shortcuts in the inbox: `j` next lead, `k` previous lead, `a` approve.

## Export

Only approved leads export, as a CSV file you download and import yourself:

* **HubSpot-style**: First Name, Last Name, Email, Company Name, Job Title, Lifecycle Stage, Lead Status, HubSpot Owner, Lead Score
* **Salesforce-style**: FirstName, LastName, Email, Company, Title, LeadSource, Status, Rating, Owner and more
* **Plain CSV** with everything

Cells that start with `=`, `+`, `-` or `@` are neutralised so a spreadsheet cannot run them as formulas.

## Optional: your own AI key

In **Settings** you can paste your own OpenAI or Anthropic key. Then "Refine with AI" rewrites the reasons and the draft reply in nicer words. The AI **cannot change the points**. The key stays in this tab's memory (or session storage if you tick the box), is sent only from your browser to the provider, and is never saved with the demo data. No key is included with the project. If the call fails, the rule-based text stays and you see a short message.

## Saving

Your changes are saved in the browser's local storage. **Reset demo** in Settings restores the sample data. If you come back after more than 30 minutes, all times shift forward so the sample leads do not look days old.

## Project layout

* `lib/`: all the logic, with a `.test.ts` next to each part (`score`, `spam`, `routing`, `export`, `workflow`, `ai`)
* `components/`: the screens
* `app/`: the Next.js page, layout and styles (a frosted "liquid glass" look with fallbacks for reduced transparency, reduced motion and high contrast)

Built with Next.js 15 (static export), React 19 and TypeScript.
