# state — clearance (hackathon, direct)

Updated 2026-10-15 ~18:30 IST. Clock: freeze Sun 18 Oct 12:28 IST, end 23:59 IST.

## Done (T01–T07, T09)
Vertical slice + full feature set + design pass, all green on typecheck+unit suite (29+ evidence entries).
Stack: Next 16 (cacheComponents OFF, falkordb/redis in serverExternalPackages — see F-0001/F-0002), falkordb@6.8, zod, vitest, tsx.
Key paths: src/lib/{schemas,graph,extract,resolve,paths,baseline,intake,decide,ask-templates,corpus-spec,corpus-load,ratelimit}.ts ·
api routes under src/app/api/{intake,matters,matters/[id],matters/[id]/decision,ask,admin/reset,health} · scripts/{seed,eval}.ts, lint-graph.mjs ·
UI: / (queue) /intake /matter/[id] /ask; direction in UI-SPEC.md; tokens in globals.css; fonts Gloock/Hanken Grotesk/Spline Sans Mono.

## BLOCKED on Saharsh (asked, twice)
- FALKORDB_URL (FalkorDB Cloud free instance, or start Docker Desktop) — gates: tests/int/** (AC-1/2/5/6/7/10), npm run eval (AC-8), seed, T08 deploy, foldcheck, T10 take.
- ANTHROPIC_API_KEY (optional; EXTRACTOR=mock works) — wanted for the final recording (live extraction on camera).

## In flight
- T11 review: fresh-context reviewer subagent running (report → .prod-build/reports/T11-review.md). Bug hunt on live URL pending T08.

## Next, in order (when env arrives)
1. export FALKORDB_URL → npm run seed → npm run test:int → npm run eval (AC-8 numbers for README).
2. Fix T11 blockers (reproduce first; failing test per bug).
3. T08: vercel deploy (project envs: FALKORDB_URL, RESET_TOKEN, EXTRACTOR/ANTHROPIC_API_KEY, LLM_DAILY_CAP) → seed via /api/admin/reset → pb.py smoke → foldcheck both sizes → signed-out browser pass.
4. T10 backup take (demo script in contract §Demo). 5. T12 final take in freeze. 6. T13 README first screen + blog + pb.py window + submit check; re-read /rules Oct 18.

## Watchouts
- Decisions idempotent via status check; alias writes re-run the pipeline (keeps matter id).
- Rate limits are in-memory per instance (fine for demo; note in README limits).
- Judge cards/queue: criteria unpublished; re-read /rules on submission day (rubric drift documented).
