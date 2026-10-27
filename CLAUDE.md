# Ladder Copilot

An AI agent that helps people pass digital identity checks the first time. The user photographs their ID and enters the details they plan to submit to a bank or fintech. The agent reads the ID, finds anything that would fail (name order, short forms, date mismatches, poor photo quality), explains the fix in the user's language, and re-checks the correction.

Built for the **Meta Global AI Developer Hackathon** (build period 27 Oct – 4 Nov 2026), track **Build for Your World**.

## Hackathon rules (do not break these)

- **New work only.** Everything in this repo is built during the hackathon. Do not copy code from older projects.
- **The repo is public.** Never commit API keys, `.env` files, or real people's ID photos. Use only fictional sample IDs.
- **Must use Meta's models** through the Meta Model API (Muse Spark, SAM 3.1, Muse Voice Transcribe) or Meta open-weight models (Muse Spark Open) via Baseten or Modal.
- **Avoid looking like a "simple image analyzer"** (a banned project type). The product is an agent: it reads, reasons, explains, and verifies, and every finding points to evidence on the document.
- **Submission deadline:** Wed 4 Nov 2026, 9:00 PM ET (Thu 5 Nov, 3:00 AM Lagos). Stop adding features after 2 Nov.

## Stack

- Next.js (App Router) with TypeScript, one app for frontend and API
- Tailwind CSS for styling
- Zod for validating API input and model output
- Vitest for unit tests
- Deploy on Vercel

## Folder structure

```
app/
  page.tsx                 # language choice + start
  check/page.tsx           # upload ID, enter details, see findings
  api/check/route.ts       # POST: run a full check
  api/recheck/route.ts     # POST: re-check corrected details
  api/ask/route.ts         # POST: voice question -> answer
lib/
  types.ts                 # shared types (single source of truth)
  agent/
    readId.ts              # step 1: extract fields + quality flags (Meta model)
    compare.ts             # step 2: deterministic mismatch rules (no AI)
    explain.ts             # step 3: fix text in the user's language (Meta model)
    recheck.ts             # step 4: re-run compare on corrected details
    runCheck.ts            # orchestrates steps 1-3
  meta/
    client.ts              # Meta Model API wrapper (mock or live)
  names/
    shortForms.ts          # known short forms, e.g. Funmi -> Funmilayo
fixtures/                  # fictional sample IDs and form entries for tests
tests/
```

## Shared types (`lib/types.ts`)

See `lib/types.ts`. It is the single source of truth for `Language`, `IdFields`, `QualityFlag`, `FindingType`, `Finding` and `CheckResult`.

## API contracts

- `POST /api/check` — multipart form: `image` (ID photo), `form` (JSON of `IdFields` the user plans to enter), `language`. Returns `CheckResult`.
- `POST /api/recheck` — JSON: `idFields`, corrected `form`, `language`. Returns `CheckResult`.
- `POST /api/ask` — multipart form: `audio`, `language`, optional `context` (last `CheckResult`). Returns `{ question: string, answer: string }`.

## Agent steps

1. **readId** — send the image to Meta's vision model. Ask for strict JSON matching `IdFields` plus `QualityFlag[]`. Validate with Zod; if invalid, retry once, then return a clear error.
2. **compare** — pure TypeScript, no AI, fully unit-tested:
   - Normalise: trim, collapse spaces, case-insensitive, strip accents for matching only.
   - **name_order**: same set of names, different order.
   - **short_form**: an entered name is a known short form (from `shortForms.ts`) or a prefix of at least 4 letters of the ID name.
   - **spelling**: names differ by 1–2 characters (Levenshtein).
   - **missing_name**: a name on the ID is absent from the form.
   - **dob_mismatch**: parse common formats (dd/mm/yyyy, yyyy-mm-dd, "14 Mar 1996") before comparing; flag day/month swaps specifically.
   - **photo_quality**: from readId's quality flags.
3. **explain** — send findings + language to Meta's text model. Ask for short, plain instructions with no jargon. Never invent procedures; if a record itself is wrong, tell the user to correct it at the issuing office with supporting documents.
4. **recheck** — run `compare` again on corrected details. `status` is `ready` only when there are no findings.

## Meta Model API

- Read the official docs before writing the client: quickstart at https://dev.meta.ai/docs/quickstart, model list at https://dev.meta.ai/docs/models, and the cookbook at https://github.com/meta-models/meta-model-cookbook. **Do not guess endpoint URLs, model IDs or request formats.** Ask if the docs are unclear.
- On Baseten, the Muse Spark Open model ID for this hackathon is `meta-models/muse-spark-open-1026`.
- Keys come from environment variables only: `META_API_KEY` (and `BASETEN_API_KEY` / Modal settings if used).
- `MOCK_MODE=true` makes `lib/meta/client.ts` return fixture responses, so the app works before API credits arrive. Default to mock mode when no key is set.

## Privacy

- Process ID images in memory only. Do not save them to disk or a database, and do not log image data or full ID numbers.
- Show a short notice in the app: "Your ID photo is used only for this check and is not stored."

## Commands

```
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build
```

`.env.local` (never committed):

```
MOCK_MODE=true
META_API_KEY=
```

## Build order

1. Scaffold the app, types, and `compare.ts` with tests (no AI needed).
2. Mock client + `/api/check` returning fixture data end to end.
3. Frontend pages calling the API.
4. Replace mocks with live Meta calls in `readId` and `explain`.
5. Re-check loop, then voice questions via Muse Voice Transcribe.
6. Polish, test with all fixtures, record demo, write README.

## Working style for Claude Code

- Keep changes small and focused on what was asked. Don't restructure files or add features beyond the request.
- Write a test for every rule in `compare.ts`.
- Run `npm test` and `npm run build` before saying something works.
