---
id: F-0002
type: failure
title: Next 16 scaffold enables cacheComponents; route segment config 'dynamic' fails the build
status: active
scope: project
components: next.config.ts
triggers: 
evidence: E0013
verified_at: 2026-10-15@373c0f4
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: e3b0c44298fc1c14
created: 2026-10-15
source: unknown
---

Attempted: export const dynamic='force-dynamic' on pages. Error: route segment config incompatible with nextConfig.cacheComponents. Root cause: Cache Components mode bans segment configs. Fix: removed cacheComponents+partialPrefetching for this fully-dynamic app (E0017). Lesson: read the scaffold's next.config before using segment configs.