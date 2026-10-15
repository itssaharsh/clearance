import { describe, expect, it } from "vitest";
import { buildCorpus, EVAL_INTAKES, PLANTED_MANIFEST, PLANTED_EDGES } from "@/lib/corpus-spec";

describe("corpus generator", () => {
  it("is deterministic: two builds are deep-equal", () => {
    expect(buildCorpus()).toEqual(buildCorpus());
  });

  it("has unique node keys and edges that reference existing nodes", () => {
    const { nodes, edges } = buildCorpus();
    const keys = nodes.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
    const keySet = new Set(keys);
    for (const e of edges) {
      expect(keySet.has(e.from), `edge from ${e.from}`).toBe(true);
      expect(keySet.has(e.to), `edge to ${e.to}`).toBe(true);
    }
  });

  it("every edge carries provenance (source + since)", () => {
    const { edges } = buildCorpus();
    for (const e of edges) {
      expect(e.source.length).toBeGreaterThan(3);
      expect(e.since).toMatch(/^\d{4}(-\d{2})?$/);
    }
  });

  it("manifest: 10 expected paths, name search finds 6 (AC-8 ground truth, corrected after review B2)", () => {
    expect(PLANTED_MANIFEST.totalExpectedPaths).toBe(10);
    expect(PLANTED_MANIFEST.baselineTotal).toBe(6);
  });

  it("hero intake stays baseline-invisible: 'Meridian Build' appears in no matter title or filler name", () => {
    const { nodes } = buildCorpus();
    const offenders = nodes.filter(
      (n) => n.key !== "org_meridian_build" && ("name" in n ? n.name : n.title).toLowerCase().includes("meridian build"),
    );
    expect(offenders).toEqual([]);
  });

  it("declared baselineFinds only where the literal adverse/client name exists in firm records", () => {
    const { nodes } = buildCorpus();
    const names = new Set(nodes.map((n) => ("name" in n ? n.name : n.title).toLowerCase()));
    // e1 names Meridian Build (node exists but only as subsidiary entity — a *name list* search over
    // matter records: our baseline searches party names attached to matters). Spot-check e4/e5 claims:
    expect(names.has("northgate & co")).toBe(true); // alias node exists
    const e4 = EVAL_INTAKES.find((i) => i.id === "e4")!;
    expect(e4.baselineFinds).toBe(0); // old name attached to no matter directly
    const aliasAttached = PLANTED_EDGES.some((e) => e.from === "org_northgate_old" && ["CLIENT_IN", "ADVERSE_IN", "DECLINED_CONSULT"].includes(e.type));
    expect(aliasAttached).toBe(false);
  });
});
