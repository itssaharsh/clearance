import { FalkorDB, Graph } from "falkordb";

// Single graph per firm (multi-graph tenancy: one FalkorDB instance, one graph id per firm).
export const GRAPH_ID = process.env.FALKORDB_GRAPH ?? "firm_demo";

const READ_TIMEOUT_MS = 3_000;

/** Raised when FalkorDB is unreachable or a query times out. Callers fail closed. */
export class GraphUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`graph unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "GraphUnavailableError";
  }
}

let clientPromise: Promise<FalkorDB> | null = null;

function connectionOptions() {
  const url = process.env.FALKORDB_URL;
  if (!url) throw new GraphUnavailableError("FALKORDB_URL is not set");
  // accept falkor://, falkors://, redis:// and rediss://
  const normalized = url.replace(/^falkor(s?):\/\//, (_m, s) => (s ? "rediss://" : "redis://"));
  const u = new URL(normalized);
  return {
    socket: { host: u.hostname, port: Number(u.port || 6379), tls: u.protocol === "rediss:" ? true : undefined },
    password: u.password || undefined,
    username: u.username || undefined,
  } as Parameters<typeof FalkorDB.connect>[0];
}

async function client(): Promise<FalkorDB> {
  if (!clientPromise) {
    clientPromise = FalkorDB.connect(connectionOptions()).catch((e) => {
      clientPromise = null; // allow retry on next call
      throw new GraphUnavailableError(e);
    });
  }
  return clientPromise;
}

export async function graph(): Promise<Graph> {
  const db = await client();
  return db.selectGraph(GRAPH_ID);
}

type Params = Record<string, string | number | boolean | string[]>;

/**
 * Guard: every read must be bounded. We require an explicit LIMIT (or an
 * aggregate-only RETURN) so an unbounded scan can't ship by accident (AC-11).
 */
export function assertBoundedRead(cypher: string): void {
  const q = cypher.toUpperCase();
  const aggregateOnly = /RETURN\s+(COUNT|SUM|AVG|MIN|MAX)\s*\(/.test(q) && !/,/.test(q.split("RETURN")[1] ?? "");
  if (!q.includes("LIMIT") && !aggregateOnly) {
    throw new Error(`unbounded read refused (add LIMIT): ${cypher.slice(0, 80)}`);
  }
}

/** Read-only query via GRAPH.RO_QUERY with a hard timeout and bounded-result guard. */
export async function roQuery<T = Record<string, unknown>>(cypher: string, params?: Params): Promise<T[]> {
  assertBoundedRead(cypher);
  try {
    const g = await graph();
    const reply = await g.roQuery<T>(cypher, { params: params as never, TIMEOUT: READ_TIMEOUT_MS });
    return (reply.data ?? []) as T[];
  } catch (e) {
    if (e instanceof GraphUnavailableError) throw e;
    throw new GraphUnavailableError(e);
  }
}

/** Write query (MERGE/CREATE/SET). Writes are the gate's records; they must be explicit and idempotent. */
export async function writeQuery<T = Record<string, unknown>>(cypher: string, params?: Params): Promise<T[]> {
  try {
    const g = await graph();
    const reply = await g.query<T>(cypher, { params: params as never, TIMEOUT: READ_TIMEOUT_MS });
    return (reply.data ?? []) as T[];
  } catch (e) {
    if (e instanceof GraphUnavailableError) throw e;
    throw new GraphUnavailableError(e);
  }
}

export async function graphUp(): Promise<boolean> {
  try {
    await roQuery("MATCH (n) RETURN count(n) AS c");
    return true;
  } catch {
    return false;
  }
}
