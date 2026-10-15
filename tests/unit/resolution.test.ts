import { describe, expect, it } from "vitest";
import { classifyMatch, resolveAgainstDirectory, type DirectoryEntry } from "@/lib/resolve";
import { MockExtractor } from "@/lib/extract";

const ex = new MockExtractor();

async function dir(names: Array<[string, string]>): Promise<DirectoryEntry[]> {
  return Promise.all(
    names.map(async ([key, name]) => ({ key, name, kind: "Org", embedding: await ex.embed(name) })),
  );
}

describe("entity resolution (AC-3: fails closed)", () => {
  it("exact normalized match is matched with confidence 1", async () => {
    const d = await dir([["k1", "Kane Logistics LLC"]]);
    const r = await resolveAgainstDirectory({ name: "kane logistics llc", kind: "org", role: "adverse" }, d, ex);
    expect(r.status).toBe("matched");
    expect(r.nodeId).toBe("k1");
    expect(r.confidence).toBe(1);
  });

  it("a near-name lands uncertain, never auto-matched (R. Kane vs Robert T. Kane)", async () => {
    const d = await dir([["p1", "Robert T. Kane"], ["x1", "Granite Row Realty"]]);
    const r = await resolveAgainstDirectory({ name: "R. Kane", kind: "person", role: "adverse" }, d, ex);
    expect(r.status).toBe("uncertain");
    expect(r.nodeId).toBe(null); // uncertain carries a candidate list, not a silent match
  });

  it("an unrelated name is new, not uncertain", async () => {
    const d = await dir([["k1", "Kane Logistics LLC"]]);
    const r = await resolveAgainstDirectory({ name: "Tern Freight", kind: "org", role: "prospective_client" }, d, ex);
    expect(r.status).toBe("new");
  });

  it("decoy precision: 'Kane & Sons Plumbing' must not match 'Kane Logistics LLC'", async () => {
    const d = await dir([["k1", "Kane Logistics LLC"], ["k2", "Kane & Sons Plumbing"]]);
    const r = await resolveAgainstDirectory({ name: "Kane & Sons Plumbing", kind: "org", role: "adverse" }, d, ex);
    expect(r.status).toBe("matched");
    expect(r.nodeId).toBe("k2");
  });

  it("classifyMatch thresholds: gap too small means uncertain (fails closed)", () => {
    expect(classifyMatch(0.99, 0.5)).toBe("matched");
    expect(classifyMatch(0.94, 0.93)).toBe("uncertain"); // two close candidates
    expect(classifyMatch(0.8, 0.2)).toBe("uncertain");
    expect(classifyMatch(0.5, 0.1)).toBe("new");
  });
});
