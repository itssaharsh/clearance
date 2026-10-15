---
id: F-0001
type: failure
title: falkordb/redis client breaks under Turbopack bundling at build page-data collection
status: active
scope: project
components: next.config.ts
triggers: 
evidence: E0016
verified_at: 2026-10-15@373c0f4
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: e3b0c44298fc1c14
created: 2026-10-15
source: unknown
---

Attempted: next build with falkordb imported in route handlers. Error: 'a.BigInt is not a function' at Collecting page data. Root cause: the bundler transforms the redis client's BigInt usage. Fix: serverExternalPackages=['falkordb','redis','@redis/client'] (E0017 green). Lesson: when a Node-native client fails at page-data collection, externalize it from bundling instead of debugging the bundle.