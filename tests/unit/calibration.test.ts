import { describe, expect, it } from "vitest";
import { buildCorpus, EVAL_INTAKES } from "@/lib/corpus-spec";
import { resolveAgainstDirectory, type DirectoryEntry } from "@/lib/resolve";
import { MockExtractor } from "@/lib/extract";

/**
 * B1 regression: resolution calibrated against the FULL seeded directory
 * (~120 names), not toy two-entry directories. No junk noun from any demo
 * intake may land "uncertain", and nothing inexact may ever auto-match.
 */

const ex = new MockExtractor();

async function fullDirectory(): Promise<DirectoryEntry[]> {
  const { nodes } = buildCorpus();
  return nodes.map((n) => ({ key: n.key, name: "name" in n ? n.name : n.title, kind: n.label }));
}

describe("resolution calibration on the full directory (B1)", () => {
  it("every eval intake resolves with zero uncertain parties (no junk questions on camera)", async () => {
    const dir = await fullDirectory();
    for (const intake of EVAL_INTAKES) {
      const parties = await ex.extractParties(intake.text);
      for (const p of parties) {
        const r = await resolveAgainstDirectory(p, dir);
        expect(r.status, `"${p.name}" in ${intake.id} resolved ${r.status} (closest: ${r.canonicalName}, ${r.confidence})`).not.toBe("uncertain");
      }
    }
  }, 30_000);

  it("junk nouns resolve as new, never matched to an unrelated record", async () => {
    const dir = await fullDirectory();
    for (const name of ["Riverside", "Calder HOA", "Ridgeline Capital", "Dmitri Aronov", "Tern Freight", "Balcony Row"]) {
      const r = await resolveAgainstDirectory({ name, kind: "org", role: "adverse" }, dir);
      expect(r.status, `"${name}" -> ${r.status} (${r.canonicalName})`).toBe("new");
    }
  }, 30_000);

  it("the planted ambiguity still asks: 'R. Kane' is uncertain with Robert T. Kane as candidate", async () => {
    const dir = await fullDirectory();
    const r = await resolveAgainstDirectory({ name: "R. Kane", kind: "person", role: "adverse" }, dir);
    expect(r.status).toBe("uncertain");
    expect(r.candidateKey).toBe("p_rkane");
  });

  it("nothing inexact ever auto-matches (fails closed): the only matched statuses are exact normalized names", async () => {
    const dir = await fullDirectory();
    const names = ["Meridian Build", "Kane Logistics LLC", "Northgate & Co", "Robert T. Kane", "Marco Vasquez"];
    for (const name of names) {
      const r = await resolveAgainstDirectory({ name, kind: "org", role: "adverse" }, dir);
      expect(r.status).toBe("matched");
      expect(r.confidence).toBe(1);
    }
    const near = await resolveAgainstDirectory({ name: "Meridian Buildings", kind: "org", role: "adverse" }, dir);
    expect(near.status).not.toBe("matched");
  });

  it("the whole-org extractor keeps '&' names intact (Northgate & Co)", async () => {
    const parties = await ex.extractParties(EVAL_INTAKES.find((i) => i.id === "e4")!.text);
    expect(parties.map((p) => p.name)).toContain("Northgate & Co");
  });
});
