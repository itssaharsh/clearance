---
id: F-0005
type: failure
title: WSL network churn (ERR_NETWORK_CHANGED) breaks long Playwright recordings against remote URLs
status: active
scope: project
components: scripts/take.ts
triggers: 
evidence: E0062
verified_at: 2026-10-15@ddd51f5
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: e3b0c44298fc1c14
created: 2026-10-15
source: unknown
---

Attempted 3x: playwright recordVideo of the full demo flow against the Vercel URL. Errors: intake POSTs failing mid-take with ERR_NETWORK_CHANGED banners in footage; third run TimeoutError at page load, while curl to the same URL was healthy seconds later. Root cause: WSL2 NAT/DNS churn during multi-minute browser sessions. Fix: record against next start (production build) on localhost with FALKORDB_URL pointed at the live cloud DB; final take records the deployed URL on the builder's machine. Lesson: long recordings in WSL target localhost; remote URLs only for short probes.