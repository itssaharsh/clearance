---
id: F-0004
type: failure
title: falkordb client keeps the Node event loop alive: CLI scripts hang after finishing
status: active
scope: project
components: scripts/eval.ts, src/lib/graph.ts
triggers: 
evidence: E0050
verified_at: 2026-10-15@d260118
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: e3b0c44298fc1c14
created: 2026-10-15
source: unknown
---

Attempted: tsx script finishing main() normally. Error: process never exits (pb run timed out at 1800s after printing PASS). Root cause: the falkordb/redis client's open socket holds the loop. Fix: closeGraph() (db.close()) + process.exit(0) at the end of every CLI entrypoint (E0051: 5.8s, exit 0). Lesson: every CLI script that opens a DB client closes it explicitly; also never print a success marker from a patch script unconditionally; verify the string replaced (the first exit patch silently missed and 'exit added' lied).