import { afterAll, beforeAll, describe, expect, it } from "vitest";
import net from "node:net";
import { closeGraph, GraphUnavailableError, roQuery } from "@/lib/graph";

// A server that accepts the TCP connection and never answers: what a dropped
// cloud connection looks like from the client's side.
let blackhole: net.Server;
let port = 0;
const realUrl = process.env.FALKORDB_URL;

beforeAll(async () => {
  blackhole = net.createServer(() => undefined);
  await new Promise<void>((r) => blackhole.listen(0, "127.0.0.1", r));
  port = (blackhole.address() as net.AddressInfo).port;
});

afterAll(async () => {
  await closeGraph();
  if (realUrl) process.env.FALKORDB_URL = realUrl;
  else delete process.env.FALKORDB_URL;
  blackhole.close();
});

describe("graph layer fails closed on a silent connection", () => {
  it("a socket that never replies rejects with GraphUnavailableError instead of hanging", async () => {
    await closeGraph();
    process.env.FALKORDB_URL = `falkor://:pw@127.0.0.1:${port}`;
    const started = Date.now();
    await expect(roQuery("MATCH (n) RETURN count(n) AS c")).rejects.toBeInstanceOf(GraphUnavailableError);
    expect(Date.now() - started).toBeLessThan(9_000);
  }, 15_000);

  it.skipIf(!realUrl)("after a dead connection, the next query reconnects and succeeds", async () => {
    process.env.FALKORDB_URL = realUrl;
    const rows = await roQuery<{ c: number }>("MATCH (n) RETURN count(n) AS c");
    expect(Number(rows[0].c)).toBeGreaterThanOrEqual(0);
  }, 15_000);
});
