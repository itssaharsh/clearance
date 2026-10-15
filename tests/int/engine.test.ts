import { beforeAll, describe, expect, it } from "vitest";
import { resetGraph } from "@/lib/corpus-load";
import { runIntakePipeline } from "@/lib/intake";
import { MockExtractor } from "@/lib/extract";
import { EVAL_INTAKES } from "@/lib/corpus-spec";

// Integration tests require a live FalkorDB (A-1). They skip without FALKORDB_URL
// and run everywhere once the env exists; the eval script (AC-8) covers the full set.
const live = Boolean(process.env.FALKORDB_URL);
const d = describe.skipIf(!live);

d("engine on seeded corpus (AC-1, AC-2)", () => {
  beforeAll(async () => {
    await resetGraph();
  }, 60_000);

  const extractor = new MockExtractor();

  it("e1 hero intake: finds the 2-hop subsidiary path and the declined consult; baseline finds nothing", async () => {
    const e1 = EVAL_INTAKES.find((i) => i.id === "e1")!;
    const report = await runIntakePipeline({ text: e1.text, title: e1.title }, { extractor });
    expect(report.status).toBe("blocked");
    const kinds = report.paths.map((p) => p.kind).sort();
    expect(kinds).toContain("corporate_family");
    expect(kinds).toContain("declined_consult");
    // the hero path: Meridian Build -> SUBSIDIARY_OF -> Meridian Group -> CLIENT_IN -> matter
    const hero = report.paths.find((p) => p.kind === "corporate_family");
    expect(hero?.hops.map((h) => h.rel)).toEqual(["SUBSIDIARY_OF", "CLIENT_IN"]);
    expect(hero?.hops.every((h) => h.source.length > 3)).toBe(true); // provenance on every hop
    // AC-2: baseline sees nothing for the adverse party names in this intake
    const adverseBaseline = report.baseline.filter((b) => ["Meridian Build"].includes(b.query));
    expect(adverseBaseline.every((b) => b.hits === 0)).toBe(true);
  }, 30_000);

  it("e4 alias intake: old name reaches the matter only through ALIAS_OF", async () => {
    const e4 = EVAL_INTAKES.find((i) => i.id === "e4")!;
    const report = await runIntakePipeline({ text: e4.text, title: e4.title }, { extractor });
    const alias = report.paths.find((p) => p.hops.some((h) => h.rel === "ALIAS_OF"));
    expect(alias).toBeTruthy();
    expect(report.status).toBe("blocked");
  }, 30_000);

  it("clean intake: no paths, still blocked pending sign-off (never auto-cleared)", async () => {
    const report = await runIntakePipeline(
      { text: "Bluewater Catering wants to sue Pelican Event Hire over a cancelled contract.", title: "clean check" },
      { extractor },
    );
    expect(report.paths).toEqual([]);
    expect(report.status).toBe("blocked");
    expect(report.blockedReason).toMatch(/no conflict found/);
  }, 30_000);
});
