import type { Extractor } from "./extract";
import { Party, ResolvedParty } from "./schemas";
import { roQuery } from "./graph";

export type DirectoryEntry = { key: string; name: string; kind: string; embedding: number[] };

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'’&]/g, " ")
    .replace(/\b(llc|inc|ltd|corp|co|plc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return dot; // embeddings are unit-norm
}

/**
 * Thresholds (AC-3, fails closed):
 *  - matched  : best >= 0.95 AND lead over runner-up >= 0.05
 *  - uncertain: best >= 0.78 (or two candidates too close to call)
 *  - new      : below
 */
export function classifyMatch(best: number, runnerUp: number): "matched" | "uncertain" | "new" {
  if (best >= 0.95 && best - runnerUp >= 0.05) return "matched";
  if (best >= 0.78) return "uncertain";
  return "new";
}

export async function resolveAgainstDirectory(party: Party, directory: DirectoryEntry[], extractor: Extractor): Promise<ResolvedParty> {
  const norm = normalizeName(party.name);

  // 1) exact normalized name
  const exact = directory.find((d) => normalizeName(d.name) === norm);
  if (exact) {
    return { party, nodeId: exact.key, canonicalName: exact.name, candidateKey: exact.key, confidence: 1, status: "matched" };
  }

  // 2) similarity: embedding cosine, lifted by a deterministic lexical affinity
  //    (surnames + initials for persons) — the legal-name failure mode is initials.
  const emb = await extractor.embed(party.name);
  const scored = directory
    .map((d) => ({ d, score: Math.max(cosine(emb, d.embedding), lexicalAffinity(party.name, d.name, party.kind)) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const runnerUp = scored[1]?.score ?? 0;
  if (!best) return { party, nodeId: null, canonicalName: null, candidateKey: null, confidence: 0, status: "new" };

  const cls = classifyMatch(best.score, runnerUp);
  if (cls === "matched") {
    return { party, nodeId: best.d.key, canonicalName: best.d.name, candidateKey: best.d.key, confidence: round(best.score), status: "matched" };
  }
  if (cls === "uncertain") {
    // fails closed: no nodeId — the attorney resolves it (ask-once alias memory writes ALIAS_OF, T05)
    return { party, nodeId: null, canonicalName: best.d.name, candidateKey: best.d.key, confidence: round(best.score), status: "uncertain" };
  }
  return { party, nodeId: null, canonicalName: null, candidateKey: null, confidence: round(best.score), status: "new" };
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Deterministic lexical affinity for person names: shared surname (last token)
 * is the anchor; initials matching remaining tokens raise it. Never reaches the
 * auto-match threshold on its own (max 0.9), so an initials-only hit stays
 * `uncertain` and goes to the attorney (fails closed).
 */
export function lexicalAffinity(a: string, b: string, kind: "person" | "org"): number {
  if (kind !== "person") return 0;
  const ta = normalizeName(a).split(" ").filter(Boolean);
  const tb = normalizeName(b).split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  if (ta[ta.length - 1] !== tb[tb.length - 1]) return 0; // surnames differ
  let score = 0.6;
  const restA = ta.slice(0, -1);
  const restB = tb.slice(0, -1);
  for (const x of restA) {
    if (restB.some((y) => y === x)) score += 0.2;
    else if (restB.some((y) => y.startsWith(x[0]) && x.length <= 2)) score += 0.2; // initial match
    else return 0.6; // a contradicting given name keeps only the surname anchor
  }
  return Math.min(score, 0.9);
}

/** Load the resolution directory from the graph (bounded; ~120 nodes in the demo firm). */
export async function loadDirectory(): Promise<DirectoryEntry[]> {
  const rows = await roQuery<{ key: string; name: string; kind: string; embedding: number[] }>(
    `MATCH (n) WHERE (n:Person OR n:Org OR n:Attorney)
     RETURN n.key AS key, n.name AS name, labels(n)[0] AS kind, n.embedding AS embedding LIMIT 500`,
  );
  // ALIAS_OF edges short-circuit exact alias names to their canonical node at query time (paths.ts);
  // the directory includes alias nodes themselves so exact alias names match their node.
  return rows.map((r) => ({ key: r.key, name: r.name, kind: r.kind, embedding: (r.embedding as number[]) ?? [] }));
}
