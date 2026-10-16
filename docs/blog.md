# A name search found 6 of 10 conflicts. The graph found all 10.

*Build notes from Graph Hacks: Context for AI Agents (WeMakeDevs x FalkorDB, October 15 to 18, 2026). The product, Clearance, is live at [clearance-chi.vercel.app](https://clearance-chi.vercel.app), and the code is at [github.com/pinectar/clearance](https://github.com/pinectar/clearance).*

Before a law firm takes a new client, someone has to answer one question: have we ever been on the other side? Big firms buy software for this. Small firms mostly keep a spreadsheet, and the check is ctrl-F plus whoever has been at the firm longest. The scary miss is not the client you already know about. It is the subsidiary of your client, suing under a different name, or the man you declined as a client last year turning up as an officer of the company now asking for help. Ctrl-F cannot see any of that, because none of it shares a string with the intake email. The connection only exists as a relationship, and missed conflicts are a leading cause of malpractice claims.

So the pitch for Clearance is one sentence: the firm's history lives in a FalkorDB graph, every new inquiry is checked by walking that graph, and the matter stays blocked until a lawyer signs the paths it drew.

## The test the idea had to pass first

Hackathon projects built on a database have a standard failure: the database is decoration, and the product is a wrapper that would work the same on Postgres. My test was blunt. Take FalkorDB out and see what is left.

What is left is a literal name search. So I put that version inside the product. Every matter report shows the drawn conflict paths, and next to them a panel labelled "Exhibit: literal name search", which checks the same intake the way a spreadsheet would. On the demo firm the graph finds 10 of 10 planted conflicts and the name search finds 6. The four misses are a subsidiary, an alias, a family tie and an officer relationship. Each of those exists only as an edge, so no string search can recover it at any level of effort. The baseline panel is the argument for the product, sitting inside the product.

## The graph

One graph per firm. People, organisations, attorneys and matters are nodes; so are the gate's own records, because a decision you cannot query later is not a record.

```
(:Person|:Org {key, name})
(:Attorney {key, name})
(:Matter {key, name, year})
(:Intake {key, title, status, report})
(:Clearance {key, by, at, action, pathsSeen})
(:Wall {key, by, at})

(a)-[:ALIAS_OF {source, since}]->(b)
(a)-[:SUBSIDIARY_OF {source, since}]->(b)
(a)-[:RELATED_TO {relType, source, since}]->(b)
(e)-[:CLIENT_IN|ADVERSE_IN|WITNESS_IN|DECLINED_CONSULT {source, since}]->(:Matter)
(:Attorney)-[:WORKED_ON {source, since}]->(:Matter)
```

Every edge carries `source` and `since`. That is the part I would defend hardest in a design review: a conflict verdict here is a path, and every hop of the path can say which record established it and when. A lawyer is not going to act on "the model thinks these are connected." A lawyer will act on "Kane Logistics is an alias of Kane Freight, per the 2024 engagement letter."

The query doing the real work is short. Variable-length traversal through the identity-and-relationship edges, then one terminal hop into the firm's matter history:

```cypher
MATCH p = (a {key: $key})-[:ALIAS_OF|SUBSIDIARY_OF|RELATED_TO*1..2]-(b)
          -[t:CLIENT_IN|ADVERSE_IN|DECLINED_CONSULT]->(m:Matter)
WHERE id(a) <> id(b)
RETURN p, type(t) LIMIT 50
```

Three hops is the cap, on purpose. For this decision a six-hop chain is not a weak signal. It is noise a lawyer would laugh at.

## Where the model is allowed to be

There is an LLM in the pipeline, and it has exactly one job: reading party names and roles out of a messy intake note. It runs behind an interface with a deterministic mock, so every test is replayable and the product works with no key at all; the deployed build points the same interface at a 72B open model. Everything after extraction is model-free. Entity resolution is three rules you can read in one sitting. Conflict detection is the Cypher above. The gate itself is fails-closed: an uncertain identity blocks the matter, a graph outage blocks every matter, and a clear with unresolved uncertainty is refused by the server. The model cannot talk the gate open, because the gate never asks the model anything.

Memory works the same way, as writes to the graph rather than text in a context window. When the system cannot tell whether "R. Kane" is the Robert T. Kane it already knows, it blocks and asks a human, once. The answer is written back as an `ALIAS_OF` edge with the attorney's name on it, and that question is never asked again, for anyone at the firm. Approved ethical walls write back too, and the next check on the same ground shows the wall instead of a raw conflict.

## What fought back

**The embedding collapse.** The first version of entity resolution used tiny 16-dimension character-bigram hash embeddings to score name similarity, with auto-match at 0.95 cosine and a human question from 0.78. Unit tests on toy directories of two entries passed. Then I ran it against the full seeded directory of about 120 names, and unrelated names were scoring 0.78 to 0.93 against each other. "Riverside" against "Granite Row Outfitters": 0.93. Sixteen dimensions means bigram collisions everywhere, and small test fixtures had hidden it completely. The demo would have drowned in false "is this the same entity?" questions, and the auto-match was one unlucky string away from silently merging two strangers, in a product whose whole claim is that it fails closed.

I deleted the embeddings. Not re-tuned, deleted. Resolution is now lexical: an exact normalized name is the only automatic match; a shared surname with matching initials (for people) or an org name whose every word appears in a record's name asks the attorney once; everything else is treated as new. Each rule is explainable in court, which, for this product, is the point. Two lessons went into the repo's failure log: calibrate any matcher against a production-sized directory in a unit test, and never let a similarity score auto-match in a system that promises to fail closed.

**The process that printed PASS and never exited.** The eval script printed its table, printed PASS, and then sat there until my harness killed it at 1800 seconds. The falkordb client keeps its socket open, and the open socket keeps Node's event loop alive. The fix is boring: close the client and exit explicitly in every CLI entrypoint. The embarrassing part is that my first patch for it printed "exit added" without checking whether the string replacement had actually matched anything. It had not. I now treat an unconditional success message in a patch script as a bug in itself.

**Smaller fights, in the order they landed:**

- Turbopack tried to bundle the redis client and the build died with `a.BigInt is not a function`. The falkordb, redis and @redis/client packages went into `serverExternalPackages`.
- FalkorDB Cloud's free tier speaks plain RESP. My `falkors://` TLS connection did not fail, which would have been kind. The handshake just hung. Plain `falkor://` connected instantly.
- FalkorDB rejects `WHERE a <> b` on nodes. You compare `id(a) <> id(b)`.
- Two integration test files ran in parallel workers, and each one reset the shared cloud graph the other was reading. One line in the vitest config (`fileParallelism: false`) and an afternoon of confusion.
- My own deterministic extractor truncated "pursue R. Kane" at the period in "R.", because the sentence splitter thought the sentence had ended. The splitter now requires two letters before a terminator.
- I tried to record the demo video against the deployed site from WSL and the recording died three times with `ERR_NETWORK_CHANGED`. The take that survived runs against a local production build pointed at the same cloud database.

None of these is exotic. That is sort of the point: the distance between "the query works" and "a stranger can open the URL and the gate holds" was two days of exactly this.

## What the 10 versus 6 does and does not claim

The demo firm is synthetic, because real conflicts data is confidential by nature and the event rules bar it anyway. The corpus is seeded and deterministic, the ten planted conflicts are listed in a public manifest in the repo, and `npm run eval` reproduces the table in a few seconds against a live graph. So 10/10 versus 6/10 is a demonstration, not a benchmark: it shows the four structural conflict types a string search cannot represent, on data built to contain them. I think that framing is more useful than a benchmark pretending to be independent, and it is honest about what three days can produce.

Clearance was built solo over those three days, with Claude Code doing a large share of the typing. The architecture decisions and the failures above are written down in the repo as ADRs and failure records, in `docs/memory/`, and I can walk through every query in this post by hand.

If you want to poke at it: open the [live app](https://clearance-chi.vercel.app), run the "Ambiguous name" sample intake, and watch the gate refuse to guess who R. Kane is. Then answer it once, run the same intake again, and watch it never ask you again.
