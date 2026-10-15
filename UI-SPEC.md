---
name: Clearance
scope: sprint
one_line: "Clearance blocks a new matter until the firm's graph proves it clean"
ambition: L1   # rows + ≤3-hop chains; legal/money stakes cap task flows at L0–L1; the comparison (paths vs zero hits) reads best flat
registers: { queue: productive, report: productive, signoff: serious, cleared: celebratory, ask: productive }
direction: "derived: canvas legal-paper #F7F4EE · ink blue-black #1B2237 · accent blue-ink-signature #1C4FD1 · display Gloock (first ledger entry; no prior runs to differ from; avoids house-style grey-paper+hairlines by warm paper, serif display, stamp data-marks)"
personality: precise
dials: { variance: 3, motion: 3, density: 6 }
stack: { app: "Next 16 + Tailwind v4 (exists)", fonts: "next/font/google: Gloock, Hanken Grotesk, Spline Sans Mono" }
archetype: dashboard/queue + report sheet
viewports: [390x844, 1440x900]
signature: { interaction: "conflict path hops draw on in order over the report", visual: "CLEARED/WALLED seal stamped on signed records" }
wow: "intake submitted → two red paths draw hop-by-hop beside a name-search panel reading 'no hits' → the matter visibly blocked until signed"
demo: { seed: "npm run seed", flag: "?demo=1 (sample intakes are one click on /intake)", reset: "POST /api/admin/reset (token)" }
live_vs_simulated: [ "graph + paths + gate: live", "extraction: live LLM or deterministic mock (labeled in /api/health)", "firm corpus: synthetic, disclosed" ]
deviations: [ "no 3D stage at L1: the hero comparison is two numbers and a chain, told better flat; hours went to states and the second judged screen", "stamp motif: a domain artifact (firms stamp filings), used once, no sound" ]
---

## 0. Brief
- One line: Clearance blocks a new matter until the firm's graph proves it clean.
- User/moment: office manager or attorney at intake, desk, desktop; judges: async video + live link, ~5 min.
- Promise: "Clearance" → the first screen is the clearance queue (blocked matters with paths, signed clearances below).
- Primary action: run the conflicts check (intake paste); on the report: sign.
- Hero object: the conflict path chain drawn over the matter report.
- Product moment: paths draw on while the baseline panel reads zero.
- Differentiator: deterministic k-hop paths with per-hop provenance vs string search, side by side.
- Artifact: the signed clearance record (who/when/paths seen).
- World inventory: engagement letter · docket number · blue-ink signature · CONFLICT stamp · ethical wall screen.
- Moving truth: none (graph state changes only on actions).
- Judging: criteria unpublished; assumed rubric incl. sponsor centrality + control & safety; judges run ~5 min async.

## 1. Judge tests
- 5s: queue of blocked matters with red path counts; identity line under the wordmark ("conflicts gate").
- 30s: sample intake → report: two paths drawn + "string search: no hits" → blocked state → sign.
- Demo-critical screens: /matter/[id] (first), / (second).
- Stills: report with paths + baseline; queue; ask answer with citations.

## 3. Screen inventory
| route | why | primary action | states |
|---|---|---|---|
| / | the promise: the clearance queue | open a blocked matter | empty, degraded(graph down), list |
| /intake | the loop's input | run the check | idle, busy, error(keeps text), 429 |
| /matter/[id] | the demo: paths vs baseline + gate | sign (clear/wall/decline) | blocked, uncertain, cleared/walled/declined, degraded |
| /ask | Track 03 beat | ask a canned question | idle, busy, empty(honest), error |

## 5. Treatment table — /matter/[id]
| Element | Tier | Levers | States | Transition |
|---|---|---|---|---|
| Conflict path cards | primary | largest region; chain pills joined by drawn connectors; per-hop provenance line | none→"no path within 3 hops" panel; walled→indigo seal chip | connectors draw in hop order, 300ms each, 60ms stagger |
| Baseline panel ("Exhibit: name search") | secondary | sunken paper panel, mono numbers, sits beside paths | zero → bold "no hits" | none |
| Decision panel | interactive/serious | one filled blue action (Sign: clear); wall amber outline; decline quiet | blocked reasons inline; uncertain radios first | stamp lands on success (scale 1.15→1, 180ms) |
| Party chips | tertiary | small bordered chips; uncertain = amber tint + "?" | — | — |
| Status banner | system | tinted band under title, never a toast | blocked red-tint / cleared green-tint | fade 150ms |
| Intake text | tertiary | collapsed paper block, mono quote | — | — |

## 9. Key copy
- Identity line: "The matter stays blocked until the graph says clean — or a lawyer signs the path it drew."
- Empty queue: "No matters yet." + [Run a sample intake]
- Degraded: "Firm graph unavailable — Clearance fails closed: nothing can be checked and nothing clears."
- No paths: "No path from any party to the firm's history within 3 hops. A negative result is a traversal, not a guess."
- Uncertain: "The system does not guess — resolve it at sign-off, and the answer is remembered."

## 11. Real-product checks
- Value: yes — the check is the job. Clarity: samples one click. Trust: every hop carries source+since; verdicts replayable.
- Feedback: buttons lock + label during flight. Failure: fails closed everywhere; inputs kept. 10x: queue LIMIT 100, paths LIMIT 50, paginate later. Maintainable: 2 deps beyond scaffold.

## 13. Acceptance
- Gates 1–4 run; skeptical evaluator: subagent cold-read of stills (gate 2); foldcheck on seeded deploy (pending FALKORDB_URL) — degraded state checked by eye at both sizes (recorded E0018/E0021).

## 14. Tokens — see globals.css (:root + @theme inline)
