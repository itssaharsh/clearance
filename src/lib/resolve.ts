import { Party, ResolvedParty } from "./schemas";
import { roQuery } from "./graph";

export type DirectoryEntry = { key: string; name: string; kind: string };

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'’&]/g, " ")
    .replace(/\b(llc|inc|ltd|corp|co|plc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic resolution (B1 fix). Rule, in one sentence for Rule 12:
 * only an exact normalized name auto-matches; a shared surname with matching
 * initials (persons) or a name whose every word appears in a record's name
 * (orgs) asks the attorney once; everything else is a new entity.
 * No similarity scores: at 120+ names, hash-embedding cosine collided badly
 * (see .prod-build/reports/T11-review.md B1), and a near-threshold auto-match
 * is the one failure a conflicts gate must never have.
 */

/** Person rule: same surname; given names must match as names or initials. 0 = no claim. */
export function personAffinity(a: string, b: string): number {
  const ta = normalizeName(a).split(" ").filter(Boolean);
  const tb = normalizeName(b).split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  if (ta[ta.length - 1] !== tb[tb.length - 1]) return 0; // surnames differ
  const restA = ta.slice(0, -1);
  const restB = tb.slice(0, -1);
  if (restA.length === 0 || restB.length === 0) return 0.8; // surname-only vs full name: ask
  for (const x of restA) {
    const asName = restB.includes(x);
    const asInitial = x.length <= 2 && restB.some((y) => y.startsWith(x[0]));
    const reverseInitial = restB.some((y) => y.length <= 2 && x.startsWith(y[0]));
    if (!asName && !asInitial && !reverseInitial) return 0; // a contradicting given name: different person
  }
  return 0.85;
}

/** Org rule: every word of the shorter name appears in the longer one (and it isn't exact). */
export function orgContainment(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  for (const t of small) if (!large.has(t)) return 0;
  return 0.85;
}

export async function resolveAgainstDirectory(party: Party, directory: DirectoryEntry[]): Promise<ResolvedParty> {
  const norm = normalizeName(party.name);

  // 1) exact normalized name: the only auto-match
  const exact = directory.find((d) => normalizeName(d.name) === norm);
  if (exact) {
    return { party, nodeId: exact.key, canonicalName: exact.name, candidateKey: exact.key, confidence: 1, status: "matched" };
  }

  // 2) ask-once candidates, deterministic and explainable
  const scored = directory
    .filter((d) => d.kind === "Person" || d.kind === "Org" || d.kind === "Attorney")
    .map((d) => ({
      d,
      score: party.kind === "person" ? personAffinity(party.name, d.name) : orgContainment(party.name, d.name),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best) {
    // never auto-match on a rule hit: the attorney confirms once, then ALIAS_OF remembers it
    return { party, nodeId: null, canonicalName: best.d.name, candidateKey: best.d.key, confidence: best.score, status: "uncertain" };
  }
  return { party, nodeId: null, canonicalName: null, candidateKey: null, confidence: 0, status: "new" };
}

/** Load the resolution directory from the graph (bounded; ~120 nodes in the demo firm). */
export async function loadDirectory(): Promise<DirectoryEntry[]> {
  const rows = await roQuery<{ key: string; name: string; kind: string }>(
    `MATCH (n) WHERE (n:Person OR n:Org OR n:Attorney)
     RETURN n.key AS key, n.name AS name, labels(n)[0] AS kind LIMIT 500`,
  );
  return rows.map((r) => ({ key: r.key, name: r.name, kind: r.kind }));
}
