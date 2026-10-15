import { writeQuery, roQuery } from "./graph";
import { buildCorpus } from "./corpus-spec";
import { MockExtractor } from "./extract";

// Idempotent loader: UNWIND ... MERGE batches keyed on `key`, plus deterministic
// name embeddings for entity resolution. Reset = wipe + load (AC-12).

const embedder = new MockExtractor();

export async function wipeGraph(): Promise<void> {
  await writeQuery("MATCH (n) DETACH DELETE n");
}

export async function loadCorpus(): Promise<{ nodes: number; edges: number }> {
  const { nodes, edges } = buildCorpus();

  const byLabel: Record<string, Array<Record<string, unknown>>> = {};
  for (const n of nodes) {
    const name = "name" in n ? n.name : n.title;
    const row: Record<string, unknown> = { key: n.key, name, embedding: await embedder.embed(name) };
    if (n.label === "Matter") Object.assign(row, { year: n.year, mstatus: n.status });
    (byLabel[n.label] ??= []).push(row);
  }

  for (const [label, rows] of Object.entries(byLabel)) {
    const extra = label === "Matter" ? ", n.year = row.year, n.mstatus = row.mstatus, n.state = 'closed'" : "";
    await writeQuery(
      `UNWIND $rows AS row MERGE (n:${label} {key: row.key}) SET n.name = row.name, n.embedding = row.embedding${extra}`,
      { rows: rows as never },
    );
  }

  const byType: Record<string, Array<Record<string, unknown>>> = {};
  for (const e of edges) {
    (byType[e.type] ??= []).push({ from: e.from, to: e.to, source: e.source, since: e.since, relType: e.relType ?? "" });
  }
  for (const [type, rows] of Object.entries(byType)) {
    await writeQuery(
      `UNWIND $rows AS row MATCH (a {key: row.from}), (b {key: row.to}) MERGE (a)-[r:${type}]->(b) SET r.source = row.source, r.since = row.since, r.relType = row.relType`,
      { rows: rows as never },
    );
  }

  for (const stmt of [
    "CREATE INDEX FOR (p:Person) ON (p.name)",
    "CREATE INDEX FOR (o:Org) ON (o.name)",
    "CREATE INDEX FOR (m:Matter) ON (m.name)",
  ]) {
    try {
      await writeQuery(stmt);
    } catch {
      /* index already exists */
    }
  }

  const [n] = await roQuery<{ c: number }>("MATCH (x) RETURN count(x) AS c");
  const [e] = await roQuery<{ c: number }>("MATCH ()-[r]->() RETURN count(r) AS c");
  return { nodes: Number(n?.c ?? 0), edges: Number(e?.c ?? 0) };
}

export async function resetGraph(): Promise<{ nodes: number; edges: number }> {
  await wipeGraph();
  return loadCorpus();
}
