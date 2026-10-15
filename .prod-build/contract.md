# Implementation contract — Clearance

Mode: hackathon · Channel: direct · Event: Graph Hacks (WeMakeDevs × FalkorDB) · Written 2026-10-15.
Upstream: `../hackathon-idea/falkordb/ideas.json` (idea: Clearance), `../hackathon-idea/falkordb/clearance-build-spec.md`. Read, not regenerated.

## Intent

An office manager or managing attorney at a small law firm, at new-client intake, pastes the inquiry; before: a shared spreadsheet, ctrl-F and memory; after: every connection path between the new parties and the firm's history is drawn, the matter is blocked until an attorney signs the drawn risk, and the signed clearance is the firm's defensible record.

## Scope

- **MUST:** synthetic firm corpus (seeded, deterministic, planted conflicts) · intake paste → LLM party extraction → entity resolution (vector + alias, fails closed) · k≤3 path engine over typed relationship edges (deterministic Cypher) · clearance report with drawn paths + name-search baseline panel · gate (blocked / cleared / walled states) + attorney sign-off write-back · Ask-the-firm panel (3–5 canned cited subgraph queries) · ethical-wall proposer (screened list from WORKED_ON; wall nodes respected by next check) · ask-once alias memory · eval script (one command, graph vs baseline table) · live deploy, signed-out, seeded, demo-reset · README first screen (schema + 5 annotated queries, compliance + AI disclosure).
- **SHOULD:** decisions-as-precedent citations (day-3 stretch; if built → add Track 02 at submission) · FalkorDB Browser view in demo.
- **COULD (listed, not built):** lateral-hire bulk sweep · walls UI beyond proposer · multi-firm switcher.
- **WON'T now:** PMS integrations, auth, payments, engagement-letter drafting, free-form text-to-Cypher, real firm data.

## Journeys

- **J1 Intake check:** paste intake text → parties extracted → resolved against firm graph (uncertain ⇒ blocked "needs review") → path engine returns every path ≤3 hops with per-hop explanation → report shows paths beside name-search baseline → matter created `blocked`.
- **J2 Decision:** attorney opens blocked matter → reviews drawn paths → signs clear / declines / approves proposed wall → Clearance (or Wall + SCREENED_BY) nodes written → queue updates; a later intake against a walled matter respects the wall.
- **J3 Ask the firm:** pick a canned question (e.g. "who has ever touched a Meridian entity?") → parameterised Cypher template → drawn subgraph with matter citations.

## Surfaces

`/` clearance queue (first screen: blocked matters with drawn paths, signed clearances below) · `/intake` paste form · `/matter/[id]` report + sign-off · `/ask` Ask-the-firm panel. API: `POST /api/intake` · `GET /api/matters` · `GET /api/matters/[id]` · `POST /api/matters/[id]/decision` · `GET /api/ask?q=<templateId>&param=…` · `POST /api/admin/reset` (token-guarded) · `GET /api/health`. Demo flag: `?demo=1` scripted intake samples.

## States

| State | J1 intake | J2 decision | J3 ask |
|---|---|---|---|
| initial | empty form + 3 sample intakes | queue of matters | question list |
| loading | "reading the intake…" steps | report skeleton | subgraph skeleton |
| success | report: paths + baseline | signed record visible in queue | drawn subgraph + citations |
| error | "extraction unavailable — matter stays blocked" + retry | write failed: state unchanged + retry | query failed + retry |
| empty | no parties found ⇒ blocked "needs review" | no paths: "no conflict found — clear to sign" | no results: "the firm has no history with X" |
| partial | some parties uncertain ⇒ blocked, uncertain listed | — n/a (atomic sign-off) | — n/a |
| retry | re-run extraction keeps pasted text | re-submit decision idempotent | re-run query |
| disabled | submit disabled while running | sign disabled until paths reviewed (scroll) | — n/a |
| permission-denied | n/a: single demo firm, no auth by design (judges must not sign in, H17) | n/a same | n/a same |
| offline/degraded | FalkorDB unreachable ⇒ banner "cannot clear: graph unavailable", everything blocked (fails closed) | same | same |

## Data (FalkorDB is the only store; one graph per firm, `firm_demo`)

| Entity/Edge | Key fields | Notes |
|---|---|---|
| Person, Org | name, kind; vector embedding on name+context | synthetic, no PII |
| Matter | title, status(blocked/cleared/walled/declined), created | source of truth for gate state |
| Edges: ALIAS_OF, SUBSIDIARY_OF, RELATED_TO(type), CLIENT_IN, ADVERSE_IN, WITNESS_IN, DECLINED_CONSULT, WORKED_ON, SCREENED_BY | every edge: `source` (record that established it), `since` | provenance mandatory |
| Clearance | by, at, paths_seen(json) | write-once |
| Wall | matter ref, screened attorneys | enforced in path engine |
| Precedent (stretch) | outcome, reason, path signature | |

Seeded corpus: ~40 matters, planted: one 2-hop subsidiary conflict, one declined-consult, one alias chain, clean decoys. Deterministic generator (seeded RNG), idempotent UNWIND…MERGE loader.

## Interfaces

| Boundary | Contract | Failure mode | Fallback |
|---|---|---|---|
| UI ↔ API | `src/lib/schemas.ts` (zod) | 4xx/5xx | typed error states above |
| API ↔ FalkorDB | `src/lib/graph.ts`; reads via `ro_query`, timeout 3s, LIMIT caps | down/timeout | fails closed: blocked + banner; health endpoint reports |
| API ↔ LLM (extraction + resolution assist) | `src/lib/extract.ts` port: `LLMExtractor` (Anthropic) / `MockExtractor` (deterministic, demo-safe) | refusal, malformed JSON, timeout, quota | fails closed: matter blocked "extraction unavailable"; mock mode via `EXTRACTOR=mock` |
| Embeddings for vector index | same port; mock = hash-based stub | same | alias-edge logic still works; vector optional in mock |

## Constraints

- Sponsor rules, verbatim: Rule 2 "FalkorDB must be the primary graph database in your project, and it must support a central part of what the product does." Rule 3 "…if the product still works once FalkorDB is taken out, the graph is decoration rather than the thing the product runs on." Rule 6 public/synthetic/own data only. Rule 10 submission list (repo, README with graph data model, "The Cypher queries or graph algorithms the product depends on", video, live deployment, track). Rules 11–13 AI disclosure + explainability.
- Criteria: none published (read 2026-10-15; re-read /rules on Oct 18). Assumed rubric (organiser pattern): impact · originality · technical excellence · sponsor centrality ("central rather than a thin wrapper around a model") · control & safety ("stop for a human before anything irreversible") · presentation.
- Abuse limits: `POST /api/intake` 5/min/IP, 10 KB body; LLM calls capped 20/day in live mode, else mock; `/api/admin/reset` requires `RESET_TOKEN`.
- Platform: Vercel (4.5 MB body cap fine); FalkorDB Cloud free-tier limits unverified (A-1).
- Deadline: freeze 2026-10-18 12:28 IST, submit before 23:59 IST.

## Acceptance criteria

- AC-1 WHEN a seeded intake naming a party two hops from a current client is submitted THE SYSTEM SHALL draw that path and set the matter blocked. Verify: `npm run test:e2e -- intake` (P0)
- AC-2 WHEN the same intake runs THE SYSTEM SHALL show the name-search baseline (0 hits) beside the graph paths. Verify: e2e intake (P0)
- AC-3 IF resolution confidence < threshold THEN THE SYSTEM SHALL file the match uncertain and keep the matter blocked. Verify: unit `resolution.test` (RED first) (P0)
- AC-4 IF the extractor fails/times out THEN THE SYSTEM SHALL keep the matter blocked with "extraction unavailable" and offer retry. Verify: unit + e2e failure path (P0)
- AC-5 WHEN an attorney signs THE SYSTEM SHALL write a Clearance node (who/when/paths_seen) and update the queue. Verify: integration `signoff.test` (P0)
- AC-6 WHEN a wall is approved THE SYSTEM SHALL write Wall + SCREENED_BY and a subsequent intake check SHALL respect it. Verify: integration `wall.test` (P1)
- AC-7 WHEN an uncertain match is resolved once THE SYSTEM SHALL write ALIAS_OF and never re-ask for that pair. Verify: integration `alias.test` (P1)
- AC-8 WHEN `npm run eval` runs on the seeded corpus THE SYSTEM SHALL print planted-conflict recall: graph 12/12 vs baseline ≤4/12 (exact numbers from the generator). Verify: `pb.py run -- npm run eval` (P0)
- AC-9 WHEN `/` opens with no input THE SYSTEM SHALL lead with the clearance queue (blocked matters with drawn paths) at 1440×900 and 390×844. Verify: browser + foldcheck (P0)
- AC-10 WHEN an Ask-the-firm question runs THE SYSTEM SHALL return a drawn subgraph whose every claim cites a matter. Verify: e2e `ask` (P1)
- AC-11 All graph reads go through `ro_query` with a 3 s timeout and LIMIT. Verify: grep gate in `npm run lint:graph` (P1)
- AC-12 WHEN `/api/admin/reset` runs THE SYSTEM SHALL restore the exact seeded corpus (3 consecutive reset+eval runs identical). Verify: scripted check (P1)

## Assumptions

- A-1 [blocking — ASKED]: a reachable FalkorDB (Saharsh's FalkorDB Cloud free instance or local Docker) provides `FALKORDB_URL`. Until then: build + unit tests proceed; integration/e2e gated.
- A-2 [blocking — ASKED]: LLM key for live extraction (`ANTHROPIC_API_KEY` or AI Gateway). Until then `EXTRACTOR=mock` (deterministic). Final recording should use live mode.
- A-3 [safe]: single demo firm, no auth — judges must not sign in.
- A-4 [reversible]: Next.js 16 + `falkordb` npm client (v6.8.0, exists ✓) on Vercel.
- A-5 [safe]: synthetic corpus, disclosed in README and video (Rule 6).

## Demo script (3 min, organiser's split)

0:00–0:20 problem: insurer stat + "small firms check with a spreadsheet". 0:20–1:50 flow: paste intake → extraction steps → two paths light (subsidiary 2-hop + declined consult) beside name-search 0 hits → matter blocked → attorney signs wall for the waivable path → Ask-the-firm question answered with citations → later intake respects the wall. 1:50–2:20 architecture: FalkorDB Browser on the firm graph; named aloud: multi-graph, vector index, variable-length Cypher, ro_query, write-back; Rule 3 beat: baseline panel = "the product with FalkorDB removed". 2:20–2:50 staged failure: "R. Kane" ambiguous → files uncertain, stays blocked. 2:50–3:00 limits + next.

## §12 Event and judged path

- **Window:** start 2026-10-14T18:31Z (Oct 15, 12:01 AM IST), freeze 2026-10-18T06:58Z (12:28 IST, pb default), end 2026-10-18T18:29Z (23:59 IST). Source: wemakedevs.org/hackathons/falkordb/rules (read 2026-10-15): "The hackathon runs from October 15, 12:01 AM IST to October 18, 11:59 PM IST." Earlier work: forbidden — Rule 8 "The main coding and design work must begin after the hackathon starts. You may discuss ideas, create notes, sketch the graph model, or prepare diagrams beforehand." Rule 9: "The original work completed during the hackathon will be judged."
- **How an entry is judged:** not published for this event (read 2026-10-15: main page, /rules, /schedule). Organiser pattern: volunteer judges, ~5 min/project ("It should take 5 minutes to judge 1 project", their judge form), async, video + README + live link; judges do not build locally (organiser stream). Re-read /rules on Oct 18 (documented rubric drift).
- **Criteria:** not published. Official anchors: Rules 2, 3, 10 (quoted in Constraints). Assumed rubric from the organiser's Agent Harness event (read live 2026-10-15), incl. "Is [the sponsor] central to the project rather than a thin wrapper around a model" and "stop for a human before anything irreversible?".
- **Criteria coverage:** Track 01 line ("the best agent that uses a graph to make decisions and take action") — met: verdict-opens-its-Cypher, block/clear/sign actions. Track 03 line ("understands how a company works and gets work done") — met: Ask-the-firm cited subgraphs; wall proposed from WORKED_ON, instantiated, respected. Impact — met: insurer stat + accept/decline decision. Originality — met: side-by-side baseline contrast. Technical excellence — met: eval table + annotated queries in README. Sponsor centrality — met: deleting FalkorDB deletes the product (Rule 3 beat staged). Control & safety — met: fails-closed uncertain match + sign-off gate. Presentation — by design until recorded.
- **Capability coverage:** T01 prize: uses a graph → every verdict is a path query on screen; makes decisions → block/clear/uncertain per intake; takes action → matter blocked until sign-off, signature written back on camera. T03 prize: understands how a company works → Ask-the-firm + firm map; gets work done → intake clearance end-to-end + wall instantiated and enforced.
- **Main result (climax):** the drawn two-hop conflict path blocking the matter while name search beside it finds nothing — native state, own run, synthetic corpus disclosed on camera. Staged failure: ambiguous "R. Kane" files as uncertain and blocks.
- **Promise coverage:** "Clearance" → the first screen is the clearance queue: blocked matters with drawn paths, signed clearances below (AC-9).
- **Tracks entered:** Track 01 + Track 03 (named at submission); Track 02 added only if the precedent stretch ships.
- **Before the clock:** idea research, judging notes, graph-model sketches and the build spec (allowed by Rule 8) live outside this repository in the builder's planning folder. README states the repository was created in-window.
