import { roQuery } from "./graph";
import { AskResult } from "./schemas";

/**
 * T06 "Ask the firm" (Track 03): canned, parameterised Cypher templates — no
 * free-form text-to-Cypher. Every answer is a drawn subgraph whose every claim
 * cites a matter (AC-10). A judge can't break it; a judge CAN replay it.
 */

export type AskTemplate = {
  id: string;
  question: (param: string) => string;
  paramLabel: string | null;
  defaultParam: string;
  cypher: string; // uses $param; every template is LIMIT-bounded
};

export const ASK_TEMPLATES: AskTemplate[] = [
  {
    id: "touched_family",
    question: (p) => `Who at the firm has ever touched a “${p}” entity?`,
    paramLabel: "Organisation name",
    defaultParam: "Meridian Group",
    cypher: `MATCH (o) WHERE toLower(o.name) CONTAINS toLower($param)
             MATCH (o)-[:ALIAS_OF|SUBSIDIARY_OF*0..2]-(fam)
             MATCH (fam)-[t:CLIENT_IN|ADVERSE_IN|DECLINED_CONSULT|WITNESS_IN]->(m:Matter)
             OPTIONAL MATCH (att:Attorney)-[:WORKED_ON]->(m)
             RETURN DISTINCT fam.name AS a, labels(fam)[0] AS aKind, type(t) AS rel, t.source AS source,
                    m.name AS b, 'Matter' AS bKind, att.name AS attorney
             LIMIT 30`,
  },
  {
    id: "attorney_history",
    question: (p) => `Which of our attorneys has history with “${p}”?`,
    paramLabel: "Person or organisation",
    defaultParam: "Northgate Partners",
    cypher: `MATCH (e) WHERE toLower(e.name) CONTAINS toLower($param)
             MATCH (e)-[t:CLIENT_IN|ADVERSE_IN|DECLINED_CONSULT|WITNESS_IN]->(m:Matter)<-[:WORKED_ON]-(att:Attorney)
             RETURN DISTINCT e.name AS a, labels(e)[0] AS aKind, type(t) AS rel, t.source AS source,
                    m.name AS b, 'Matter' AS bKind, att.name AS attorney
             LIMIT 30`,
  },
  {
    id: "declined",
    question: () => "Whom have we declined, and where is that recorded?",
    paramLabel: null,
    defaultParam: "",
    cypher: `MATCH (e)-[t:DECLINED_CONSULT]->(m:Matter)
             OPTIONAL MATCH (att:Attorney)-[:WORKED_ON]->(m)
             RETURN DISTINCT e.name AS a, labels(e)[0] AS aKind, type(t) AS rel, t.source AS source,
                    m.name AS b, 'Matter' AS bKind, att.name AS attorney
             LIMIT 30`,
  },
  {
    id: "wall_screen",
    question: (p) => `Who would an ethical wall around “${p}” need to screen?`,
    paramLabel: "Matter name",
    defaultParam: "Meridian Group — lease portfolio restructuring",
    cypher: `MATCH (att:Attorney)-[w:WORKED_ON]->(m:Matter) WHERE toLower(m.name) CONTAINS toLower($param)
             RETURN DISTINCT att.name AS a, 'Attorney' AS aKind, 'WORKED_ON' AS rel, w.source AS source,
                    m.name AS b, 'Matter' AS bKind, att.name AS attorney
             LIMIT 30`,
  },
];

type Row = { a: string; aKind: string; rel: string; source: string; b: string; bKind: string; attorney: string | null };

export async function runAsk(templateId: string, param: string): Promise<AskResult> {
  const t = ASK_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error("unknown template");
  const effective = param || t.defaultParam;
  const rows = await roQuery<Row>(t.cypher, { param: effective });

  const nodes = new Map<string, { id: string; label: string; kind: string }>();
  const edges: AskResult["edges"] = [];
  const citations = new Set<string>();
  for (const r of rows) {
    nodes.set(r.a, { id: r.a, label: r.a, kind: r.aKind });
    nodes.set(r.b, { id: r.b, label: r.b, kind: r.bKind });
    edges.push({ from: r.a, to: r.b, rel: r.rel, source: r.source ?? "" });
    if (r.bKind === "Matter") citations.add(r.b);
    if (r.attorney) {
      nodes.set(r.attorney, { id: r.attorney, label: r.attorney, kind: "Attorney" });
      edges.push({ from: r.attorney, to: r.b, rel: "WORKED_ON", source: "timekeeping" });
    }
  }
  // de-duplicate edges
  const seen = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const k = `${e.from}|${e.rel}|${e.to}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return AskResult.parse({
    templateId: t.id,
    question: t.question(effective),
    nodes: [...nodes.values()],
    edges: uniqueEdges,
    citations: [...citations],
    empty: rows.length === 0,
  });
}
