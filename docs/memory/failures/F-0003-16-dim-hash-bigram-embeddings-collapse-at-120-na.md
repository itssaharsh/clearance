---
id: F-0003
type: failure
title: 16-dim hash-bigram embeddings collapse at ~120-name directory: unrelated names cosine 0.8-0.93
status: active
scope: project
components: src/lib/resolve.ts
triggers: 
evidence: E0034
verified_at: 2026-10-15@3becca3
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: e3b0c44298fc1c14
created: 2026-10-15
source: unknown
---

Attempted: cosine over 16-dim character-bigram hash embeddings with matched>=0.95, uncertain>=0.78. Error: on the full seeded directory, junk nouns matched unrelated records at up to 0.93 ('Riverside'~'Granite Row Outfitters'), burying the demo in false identity questions; auto-match was one string from a silent false positive. Root cause: 16 dims give massive bigram collisions; toy 2-entry test directories hid it. Fix: deterministic lexical rules (exact normalized name auto-matches; surname+initials for persons and whole-word containment for orgs ask once; else new) — E0036 green incl. a full-directory calibration test. Lesson: calibrate any matcher against the full production-size directory in a unit test, and never let similarity scores auto-match in a fails-closed gate.