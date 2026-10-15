import { roQuery } from "./graph";
import { BaselineResult } from "./schemas";

/**
 * The incumbent: a literal name search over party names attached to matters.
 * Shown beside the graph result (AC-2). Finds only exact-substring name hits —
 * which is the point.
 */
export async function baselineSearch(name: string): Promise<BaselineResult> {
  const rows = await roQuery<{ name: string }>(
    `MATCH (e)-[:CLIENT_IN|ADVERSE_IN|WITNESS_IN|DECLINED_CONSULT]->(m:Matter)
     WHERE toLower(e.name) CONTAINS toLower($q)
     RETURN DISTINCT e.name AS name LIMIT 25`,
    { q: name },
  );
  return BaselineResult.parse({ query: name, hits: rows.length, hitNames: rows.map((r) => r.name) });
}
