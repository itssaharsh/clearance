# T11 — Fresh-context adversarial review (Clearance)

Reviewer: fresh-context subagent, 2026-10-15. Scope: static review + local gates. No live FalkorDB in this
environment (no Docker either), so every Cypher claim below is static reasoning plus a faithful in-memory
simulation of the path engine and baseline over `corpus-spec.ts` (simulation script:
`/tmp/claude-1000/-home-saharsh-contri-flakor/ed6aca6e-5a83-4cc0-9819-5f335854758a/scratchpad/sim-eval.ts`).

Local gates, all run during review: `npm run typecheck` PASS · `npm test` PASS (24 passed, 10 skipped — all
integration tests skip without `FALKORDB_URL`) · `npm run lint:graph` PASS · `npm run build` PASS.
Evidence ledger check: **no `npm run eval`, `npm run seed`, or `test:int` run has ever been recorded** — zero
Cypher in this repo has ever executed against a real FalkorDB.

Counts: **5 BLOCKER / 7 MAJOR / 14 MINOR**

---

## BLOCKERS

### B1 — Entity resolution is miscalibrated: nearly every genuinely-new name files as "uncertain", poisoning the hero demo
**Where:** `src/lib/resolve.ts:28-32` (thresholds), `src/lib/extract.ts:58-68` (16-dim bigram hash embedding).

The uncertain threshold is `best >= 0.78` on cosine over a 16-dimension character-bigram hash embedding. At 16
dims, unrelated names routinely score 0.8–0.93. Verified by running the repo's own code against the seeded
directory (~120 nodes):

```
Riverside          uncertain  closest: Granite Row Outfitters conf: 0.93
Prospective        uncertain  closest: Eastbrook Analytics    conf: 0.85
Calder HOA         uncertain  closest: Nora Holt              conf: 0.83
Ridgeline Capital  uncertain  closest: Granite Row Marine     conf: 0.85
Dmitri Aronov      uncertain  closest: Kestrel Marine         conf: 0.84
Tern Freight       uncertain  closest: Fairweather Freight    conf: 0.85
Balcony Row        uncertain  closest: Nora Grieg             conf: 0.81
```

Concrete demo failure — the **first sample button on /intake ("Warehouse suit (the hero case)")** resolves to:

```
New(pc)=new | Kane Logistics LLC=matched | Meridian Build=matched |
Riverside=uncertain ->Granite Row Outfitters 0.93 | Primary=new | Robert T. Kane=matched
```

So the hero matter blocks with headline *"uncertain identity: Riverside — needs review"* (intake.ts:66-68 puts
uncertainty ahead of the path count), and the DecisionPanel asks the attorney, on camera, whether **"Riverside"
is "Granite Row Outfitters" (93%)**. Sample 2 asks whether **"Calder HOA" is "Nora Holt" (83%)**. The scripted
climax ("two paths light… matter blocked… attorney signs") is buried under junk identity questions, and "Sign:
clear" is disabled/refused until each junk name is dispositioned (see B3). A 0.93 for a fully unrelated pair also
means the 0.95 auto-match bar is one plausible string away from a silent **false match** — the one thing the
whole fails-closed design exists to prevent. The unit tests never caught this because they use 1–2 entry
directories; against the real 120-name directory the thresholds collapse.

### B2 — AC-8 eval cannot pass: graph recall is 10/12 (script exits 1) and measured baseline is 7/12, not ≤4/12
**Where:** `scripts/eval.ts:58-63` (exit 1 below 12/12), `src/lib/corpus-spec.ts:129-133` (e6), `:143-152` (e8),
`src/lib/paths.ts:118-127` (kind precedence), `src/lib/baseline.ts:11-13` (CONTAINS).

Simulated full eval (engine logic replicated 1:1, including the undirected `*1..2` traversal, `a<>b`, dedupe):

```
e1 2/2  e2 1/1  e3 1/1  e4 1/1  e5 1/1  e6 1/2  e7 1/1  e8 2/3
TOTAL graph 10/12   baseline 7/12   (manifest claims 12/12 vs 4/12)
```

- **e6** expects two kinds (`related_person` + `declined_consult`) from what is physically **one** path
  (p_rkane -RELATED_TO-> org_kane -DECLINED_CONSULT-> m031). `toConflictPath` gives terminal
  `DECLINED_CONSULT` precedence (paths.ts:120-121), so only `declined_consult` is ever produced → 1/2.
- **e8** expects a third `corporate_family` path "alias Northgate & Co history", but `org_northgate_old` has no
  terminal edge, so `(new)-[ALIAS_OF]-(old)-[terminal]->(m)` matches nothing → 2/3.
- **Baseline** measured by the script's own method is 7/12, not ≤4/12: `CONTAINS` hits that the hand-written
  `baselineFinds` ignores — e1 "Kane Logistics LLC" hits its own DECLINED_CONSULT record, e4 party "Northgate"
  (extractor truncates at "&") substring-matches "Northgate Partners", e8 both parties hit directly, while the
  claimed hits for e6 (manifest 1, measured 0) go the other way. The printed table will contradict the
  manifest line printed directly beneath it, and `tests/unit/corpus.test.ts` ("manifest: … baseline finds 4")
  pins the wrong ground truth.

So the one-command AC-8 artifact ("graph 12/12 vs baseline ≤4/12") fails with exit 1 and prints a
self-contradicting table. This was never noticed because eval has never been run (no DB).

### B3 — "a new entity" resolution is a dead end: an uncertain matter can never be cleared through the UI
**Where:** `src/components/DecisionPanel.tsx:80-84` (choice `"__new__"` is dropped at :32), `src/lib/decide.ts:59`
(empty `resolveAliases` skips the re-run), `src/lib/decide.ts:67-69` (clear refused while `uncertain.length > 0`).

Scenario: matter blocked with uncertain "Riverside". Attorney picks **"a new entity"** (the correct answer),
types their name — "Sign: clear" is now **enabled** (`needsAliasChoices` is satisfied by `"__new__"`,
DecisionPanel.tsx:57) — clicks it → the request carries no `resolveAliases`, the server re-checks
`report.uncertain.length > 0` and returns **409 "cannot clear: uncertain identity remains"**, every time.
There is no server-side way to resolve uncertain→new at all. Combined with B1 (junk names are uncertain on
almost every intake), **the "clear" action is effectively unreachable** except on intakes with zero uncertain
parties; the only workaround is declaring junk aliases (e.g. "Riverside" ALIAS_OF "Granite Row Outfitters"),
which permanently writes false identity edges into the firm graph and corrupts every later check.
Related: if `candidateKey` is null (legacy report), the "is X" radio writes `""` (DecisionPanel.tsx:74), which
keeps `needsAliasChoices` true — the radio appears selected but the clear button stays disabled with no
explanation.

### B4 — Resolving an alias at decision time persists a duplicate blocked matter into the queue
**Where:** `src/lib/decide.ts:59-64` calls `runIntakePipeline(...)`, which **always persists** the re-run under a
freshly generated id (`src/lib/intake.ts:23`, `:74`, `persistReport` at `:85-90`). `decideMatter` then copies the
original id onto the in-memory object and updates the original Intake node — but the re-run's Intake node
(same title, status `blocked`) stays in the graph.

Concrete scenario (the scripted staged failure): intake "R. Kane" → uncertain → attorney resolves
"R. Kane = Robert T. Kane" and declines → queue now shows the declined matter **plus a brand-new blocked
duplicate with the identical title**, on camera, every single time the ask-once alias flow is demonstrated.
`state.md`'s watchout ("alias writes re-run the pipeline (keeps matter id)") is wrong — it keeps the id only in
the HTTP response. The integration test (tests/int/decide.test.ts AC-7) checks paths, never queue cardinality,
so it would pass against a live DB and miss this.

### B5 — README is still the create-next-app scaffold: contract MUST + sponsor Rule 10 unmet
**Where:** `README.md` (entire file).

The contract MUST line includes "README first screen (schema + 5 annotated queries, compliance + AI
disclosure)", and Rule 10 requires "README with graph data model" and "The Cypher queries or graph algorithms
the product depends on". The README is the untouched Next.js scaffold ("This is a Next.js project bootstrapped
with create-next-app…"). No env vars are documented anywhere (`FALKORDB_URL`, `RESET_TOKEN`, `EXTRACTOR`,
`ANTHROPIC_API_KEY`, `LLM_DAILY_CAP` appear only in code/state.md). Plan.json shows this is T13 ("todo"), so it
is scheduled — but as the repo stands it fails a hard submission requirement, and the AC verify commands the
contract names (`npm run test:e2e -- intake`) don't exist in `package.json` either (only `test`, `test:int`).

---

## MAJOR

### M1 — `WHERE a <> b` compares node variables; FalkorDB docs say entities are "not internally comparable" — the core conflict query may error on every intake
**Where:** `src/lib/paths.ts:39-40` (the indirect/2-hop query — the product's wedge, AC-1).
FalkorDB's cypher-support page states: *"We do not support any of these properties at the type level, meaning
nodes and relationships are not internally comparable."* If `a <> b` on nodes raises a runtime error (as that
line suggests it may), every intake's indirect query throws → `GraphUnavailableError` → every matter reports
"graph unavailable" and nothing ever shows the hero 2-hop path. Because **no query in this repo has ever been
executed against a real FalkorDB** (see ledger note above), this is unverified in both directions. Safe rewrite
is one token: `WHERE id(a) <> id(b)`, which is unambiguously supported. Lower-risk cousins to verify on first
live run: `*0..2` zero-hop union traversal (`ask-templates.ts:25`), multi-type variable-length
`[:ALIAS_OF|SUBSIDIARY_OF|RELATED_TO*1..2]` (paths.ts:39), `ORDER BY i.createdAt` on a non-returned property
(intake.ts:94). `coalesce`, `labels(n)[0]`, `collect()`, `OPTIONAL MATCH`, `CONTAINS`, `toLower($param)` and
map-array `UNWIND $rows` params are all fine (params are client-escaped: checked
`node_modules/falkordb/dist/src/commands/index.js` — `"` and `\` escaped, objects/arrays serialized).

### M2 — Wall write silently degrades when screened names don't match Attorney nodes
**Where:** `src/lib/decide.ts:78-91`. The single write query pipes `UNWIND $screened AS sname MATCH (a:Attorney
{name: sname})` → a screened name with no exact Attorney match drops that row **silently**; if **no** name
matches, zero rows survive the `WITH w` and the `UNWIND $matters … MERGE (w)-[:AROUND]->(m)` never runs — the
Wall node exists with **no SCREENED_BY and no AROUND edges**, yet the matter is set `walled`. The wall is then
invisible to `annotateWalls` (paths.ts:70 matches via AROUND), i.e. a later intake does NOT respect it (AC-6
fails for that matter). Normal UI flow sends names from `proposeWall` so they match, but any API caller, trailing
whitespace, or a renamed attorney hits it. Fix: resolve/validate screened names first and fail the decision if
none match; use separate statements for SCREENED_BY and AROUND.

### M3 — Failed-extraction (and graph-down) intakes are never persisted, but the UI navigates to the matter page → 404
**Where:** `src/lib/intake.ts:41-49` (early returns skip `persistReport`), `src/app/intake/page.tsx:41`
(`router.push(\`/matter/${body.id}\`)` on any 201). Paste ≥10 chars of text with no proper nouns ("meeting notes
about the warehouse dispute…") → MockExtractor throws → API returns 201 with a blocked report that exists
nowhere → matter page `notFound()` → raw 404. The contract's error state ("extraction unavailable — matter
stays blocked + retry", AC-4) is unreachable through the UI; the blocked-on-failure matter also never appears in
the queue, contradicting J1 ("matter created blocked"). Same for the graph-down path (there the matter page at
least shows the fail-closed banner, but the matter still isn't in the queue once the graph returns).

### M4 — The demo's "name search: 0 hits" claim is false for the hero intake
**Where:** `src/lib/baseline.ts:11-13` vs contract demo script ("name-search 0 hits") and `layout.tsx:12-14`
(metadata: "Name search finds 'Kane Logistics'…" — ironically correct). Simulated: for e1/hero,
"Kane Logistics LLC" scores a baseline **hit** (its own DECLINED_CONSULT record is attached to M-031 under its
exact name). Measured baseline for the hero is 1, not 0. `tests/int/engine.test.ts:28-30` quietly asserts only
`["Meridian Build"]` baseline = 0 — a weakened assertion that masks the discrepancy. The side-by-side contrast
still works (graph 2 paths vs 1 name hit) but the rehearsed "zero hits" line and AC-2's "(0 hits)" would be
visibly wrong on camera.

### M5 — "Vector index" is claimed but never used
**Where:** contract Data section ("vector embedding on name+context"), demo script ("named aloud: … vector
index"); `src/lib/corpus-load.ts:44-48` creates only range indexes on `name`; no `CREATE VECTOR INDEX` or
`db.idx.vector.queryNodes` anywhere; similarity is JS cosine over 16-dim hashes in app code
(`resolve.ts:43-53`), and `LLMExtractor.embed` deliberately returns the hash too (`extract.ts:115-118`).
FalkorDB's vector capability — a named judging beat — is not exercised. Either build the vector index (and fix
B1 with real embeddings) or strike the claim from the demo/README.

### M6 — Rate limiting and LLM budget are spoofable and per-instance
**Where:** `src/lib/ratelimit.ts:23-26` — `clientIp` trusts the first `x-forwarded-for` entry, which the client
controls (prepend any value → unlimited intakes); buckets and the 20/day LLM budget (`:29-49`) are module-level
memory, so on Vercel each lambda instance (and each cold start) has its own counters — the "cap" on paid LLM
calls is effectively per-instance-per-day, and a judge hammering refresh across instances never sees a 429.
Acceptable for a demo if documented (state.md plans this for the README), but the contract lists these as
Constraints; at minimum note both caveats in README and don't present the cap as a hard limit.

### M7 — Concurrent decisions are not atomic
**Where:** `src/lib/decide.ts:54-56` (read status) … `:78-109` (writes). Two simultaneous POSTs (double-click
before `busy` lands, or two tabs) both see `blocked`, both write (e.g. one Clearance + one Wall) with distinct
random keys; last `SET i.status` wins, both decision nodes remain — the "write-once" Clearance invariant breaks.
Sequential idempotency (the re-decide refusal) is tested; the race isn't. Fix: optimistic guard in the write
(`MATCH (i:Intake {key:$id, status:'blocked'}) SET …` + check affected count, or `MERGE (c:Clearance {matter:$id})`
keyed on the matter, not a random key).

---

## MINOR

1. **`?demo=1` scripted-samples flag** (contract Surfaces) not implemented — samples always render; nothing
   reads the query param (`src/app/intake/page.tsx`).
2. **Ask API param mismatch:** contract says `GET /api/ask?q=<templateId>`; implementation uses `tid`
   (`src/app/api/ask/route.ts:6`). Cosmetic but will bite anyone following the contract.
3. **"Sign disabled until paths reviewed (scroll)"** (contract States, J2 disabled row) not implemented — sign
   buttons enable as soon as a name is typed (`DecisionPanel.tsx:117`).
4. **Alias nodes are always `:Person`** even when the uncertain party is an org (`decide.ts:37`), so a resolved
   org alias later shows kind "Person" in paths/directory; it also carries `embedding: []` (fine for exact match,
   invisible to cosine).
5. **`writeAliases` with a non-existent `canonicalKey`** (API caller) silently writes nothing (`MATCH` yields 0
   rows → `MERGE` never runs, decide.ts:36-40) → re-run still uncertain → confusing 409 with no hint.
6. **Alias name equal to the canonical node's own name** can MERGE onto the canonical `:Person` and create a
   self-`ALIAS_OF` loop; harmless for traversal (dedupe + no edge reuse) but junk data.
7. **Reset during an in-flight intake** can interleave `DETACH DELETE` with `persistReport`, leaving a stray
   Intake node after "exact corpus restore" (corpus-load.ts:10-12 vs intake.ts:85-90). AC-12's 3× identical check
   only holds without concurrent traffic.
8. **`RESET_TOKEN` compare is non-constant-time** and the endpoint has no rate limit
   (`src/app/api/admin/reset/route.ts:8`). Demo-acceptable; note it.
9. **A single malformed `i.report`** (schema drift beyond the two defaulted fields `candidateKey`/`wall`) makes
   `listMatters` throw for the whole queue — `/` shows the misleading "Firm graph unavailable" banner and
   `/api/matters` 500s (`intake.ts:96`, `page.tsx:11-13`). Zod defaults cover today's known evolution only.
10. **Rate-limit token consumed before validation** (`api/intake/route.ts:6-9`): 5 malformed posts lock out a
    legitimate 6th. Content-length check trusts the header, but zod's 10k cap on `text` backstops it.
11. **The 3 s "timeout" is server-side only** (`graph.ts:65` passes `TIMEOUT` to FalkorDB): a hung TCP connection
    or slow connect isn't bounded by it (node-redis connect timeout applies instead). AC-11's wording oversells it.
12. **Eval baseline metric is mushy:** `min(partiesWithAnyHit, expectPaths.length)` counts any party hit as
    covering an expected path (eval.ts:36-38) — it can both overcount and undercount; it's also what produces
    the 7/12 in B2. Define baseline per expected path, not per party.
13. **Dead scaffold files:** `public/{file,globe,next,vercel,window}.svg` unused by any source; `tsconfig.tsbuildinfo`
    committed. `queue page` (AC-9) shows path *counts*, not the "drawn paths" the AC text promises — confirm the
    intended reading before the foldcheck.
14. **Alias re-run uses `selectExtractor()`, not the mode that produced the report** (`decide.ts:61` →
    `intake.ts:38`): in live-LLM mode the re-extraction is nondeterministic and burns LLM budget inside a
    decision POST.

**Checked and clean:** Cypher injection (every user string is a `$param`; the only `${}` in query strings are
compile-time constants — label/type names from code); `ANTHROPIC_API_KEY`/`RESET_TOKEN` never reach client
components (client files import only types/schemas); SSRF none (`extract.ts` fetches a fixed Anthropic URL;
`claude-haiku-5-5` is a valid current model id); `serverExternalPackages` correctly carries falkordb/redis past
the Turbopack bundling failure (F-0001); dependency surface is 5 runtime deps, all sane; reset is properly
403-disabled when `RESET_TOKEN` is unset; health endpoint and fail-closed banners behave as specified;
`assertBoundedRead` + lint:graph genuinely cover every query in the repo (all 11 reads carry LIMIT or are
aggregate-only); corpus generator is deterministic (verified by unit test) and loader MERGEs are idempotent.

---

## Prioritized fix list

1. **(B1) Recalibrate resolution** — the 16-dim hash cosine cannot support a 0.78 uncertain threshold. Quickest
   safe fix: only allow "uncertain" when there is lexical evidence (`lexicalAffinity ≥ 0.6` or shared
   normalized token) OR cosine ≥ ~0.97 with the current embedding; or move to the FalkorDB vector index with real
   embeddings (also resolves M5). Re-run the sim on all 8 eval intakes + 3 UI samples: zero junk "uncertain".
2. **(B3) Implement uncertain→new** — accept `"__new__"` (or `resolvedNew: string[]`) in `DecisionRequest`,
   remember it (e.g. a `ResolvedNew` node or name list on the Intake), exclude it from `uncertain` on re-run;
   fix the DecisionPanel null-candidateKey radio.
3. **(B4) Stop the duplicate persist** — give `runIntakePipeline` a `persist: false` option (or a fixed id) for
   the decide-time re-run; assert queue cardinality in the AC-7 integration test.
4. **(B2) Fix AC-8 ground truth + metric** — e6 expects 1 path (or emit both kinds for officer+declined), e8
   expects 2; recompute `baselineFinds` with the actual CONTAINS semantics (or scope baseline to adverse
   parties); align `PLANTED_MANIFEST`, `corpus.test.ts`, and the README table; then run `npm run eval` against a
   live DB through `pb.py` for the evidence ledger.
5. **(M1) `WHERE a <> b` → `WHERE id(a) <> id(b)`** and, the moment a FalkorDB URL exists, run `test:int` + eval
   before anything else — zero Cypher has ever executed; verify `*0..2`, the multi-type `*1..2`, and
   `ORDER BY i.createdAt`.
6. **(B5) Write the real README** (schema, 5 annotated queries, env vars, AI disclosure, limits incl. M6) — it's
   a Rule-10 submission gate, not a nice-to-have; add the missing `test:e2e` script or fix the AC verify text.
7. **(M3) Persist failure reports** (or return them without an id and render inline with retry) so AC-4's retry
   state exists and failed intakes appear blocked in the queue.
8. **(M2) Harden the wall write** — validate screened names, split the UNWINDs, refuse the decision if no
   Attorney matched.
9. **(M4) Fix the demo copy** — rehearse "1 stale name hit vs the 2 live paths" for the hero, or scope the
   baseline panel to adverse parties; strengthen the weakened int-test assertion.
10. **(M7)** make the status flip atomic; **(M6)** document the rate-limit caveats; then the minors as time
    allows (they're logged above with file:line).
