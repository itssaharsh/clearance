import { roQuery } from "./graph";
import { ConflictPath, PathHop } from "./schemas";

// Deterministic conflict discovery: k<=3 openCypher traversals from each resolved
// party to the firm's matter history. The model never touches this layer.

type RawPath = {
  nodeNames: string[];
  nodeKinds: string[];
  relTypes: string[];
  relSources: string[];
  relSinces: string[];
  relSubtypes: string[];
  matter: string;
  terminal: string;
};

const CONNECTOR = "ALIAS_OF|SUBSIDIARY_OF|RELATED_TO";
const TERMINAL = "CLIENT_IN|ADVERSE_IN|WITNESS_IN|DECLINED_CONSULT";

/** All conflict paths from a party node, 1 hop (direct) to 3 hops (via <=2 connector edges). */
export async function conflictPathsFor(nodeKey: string): Promise<ConflictPath[]> {
  // Direct: party -> matter
  const direct = await roQuery<RawPath>(
    `MATCH p = (a {key: $key})-[t:${TERMINAL}]->(m:Matter)
     RETURN [n IN nodes(p) | n.name] AS nodeNames,
            [n IN nodes(p) | labels(n)[0]] AS nodeKinds,
            [r IN relationships(p) | type(r)] AS relTypes,
            [r IN relationships(p) | r.source] AS relSources,
            [r IN relationships(p) | r.since] AS relSinces,
            [r IN relationships(p) | coalesce(r.relType,'')] AS relSubtypes,
            m.name AS matter, type(t) AS terminal
     LIMIT 50`,
    { key: nodeKey },
  );

  // Indirect: party -(connector*1..2, any direction)- entity -> matter
  const indirect = await roQuery<RawPath>(
    `MATCH p = (a {key: $key})-[:${CONNECTOR}*1..2]-(b)-[t:${TERMINAL}]->(m:Matter)
     WHERE a <> b
     RETURN [n IN nodes(p) | n.name] AS nodeNames,
            [n IN nodes(p) | labels(n)[0]] AS nodeKinds,
            [r IN relationships(p) | type(r)] AS relTypes,
            [r IN relationships(p) | r.source] AS relSources,
            [r IN relationships(p) | r.since] AS relSinces,
            [r IN relationships(p) | coalesce(r.relType,'')] AS relSubtypes,
            m.name AS matter, type(t) AS terminal
     LIMIT 50`,
    { key: nodeKey },
  );

  const all = [...direct, ...indirect].map(toConflictPath);
  // de-duplicate identical paths (alias loops can produce mirrors)
  const seen = new Set<string>();
  return all.filter((p) => {
    const sig = p.hops.map((h) => `${h.from}|${h.rel}|${h.to}`).join(">");
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

function explainHop(rel: string, subtype: string, from: string, to: string): string {
  switch (rel) {
    case "ALIAS_OF":
      return `${from} is the same entity as ${to} (renamed)`;
    case "SUBSIDIARY_OF":
      return `${from} is a subsidiary of ${to}`;
    case "RELATED_TO":
      return subtype === "officer" ? `${from} is an officer of ${to}` : `${from} is family of ${to}`;
    case "CLIENT_IN":
      return `${from} is our client in ${to}`;
    case "ADVERSE_IN":
      return `${from} was the adverse party in ${to}`;
    case "WITNESS_IN":
      return `${from} was a witness in ${to}`;
    case "DECLINED_CONSULT":
      return `${from} consulted us and was declined (${to})`;
    default:
      return `${from} — ${rel} — ${to}`;
  }
}

function toConflictPath(r: RawPath): ConflictPath {
  const hops: PathHop[] = r.relTypes.map((rel, i) => ({
    from: r.nodeNames[i],
    fromKind: r.nodeKinds[i],
    rel,
    to: r.nodeNames[i + 1],
    toKind: r.nodeKinds[i + 1],
    source: r.relSources[i] ?? "",
    since: r.relSinces[i] ?? "",
    explanation: explainHop(rel, r.relSubtypes[i] ?? "", r.nodeNames[i], r.nodeNames[i + 1]),
  }));

  const viaConnector = r.relTypes.some((t) => t === "ALIAS_OF" || t === "SUBSIDIARY_OF");
  const viaFamily = r.relTypes.some((t) => t === "RELATED_TO");
  const kind =
    r.terminal === "DECLINED_CONSULT"
      ? "declined_consult"
      : viaConnector
        ? "corporate_family"
        : viaFamily
          ? "related_person"
          : "direct_adversity";

  const severity = r.terminal === "CLIENT_IN" || r.terminal === "ADVERSE_IN" ? "conflict" : "caution";
  const waivable = kind !== "direct_adversity";

  return ConflictPath.parse({
    id: hops.map((h) => `${h.from}>${h.rel}>${h.to}`).join("::").slice(0, 180),
    kind,
    severity,
    waivable,
    hops,
  });
}
