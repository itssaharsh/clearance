import { beforeAll, describe, expect, it } from "vitest";
import { resetGraph } from "@/lib/corpus-load";
import { runIntakePipeline } from "@/lib/intake";
import { decideMatter, proposeWall } from "@/lib/decide";
import { MockExtractor } from "@/lib/extract";
import { EVAL_INTAKES } from "@/lib/corpus-spec";

const live = Boolean(process.env.FALKORDB_URL);
const d = describe.skipIf(!live);
const extractor = new MockExtractor();

d("decisions on the seeded graph (AC-5, AC-6, AC-7)", () => {
  beforeAll(async () => {
    await resetGraph();
  }, 60_000);

  it("AC-5: sign-off writes a Clearance record and the matter leaves the blocked queue", async () => {
    const report = await runIntakePipeline(
      { text: "Bluewater Catering wants to sue Pelican Event Hire over a cancelled contract.", title: "clean sign-off" },
      { extractor },
    );
    expect(report.status).toBe("blocked");
    const decided = await decideMatter(report.id, { action: "clear", by: "Priya Shah" });
    expect(decided.status).toBe("cleared");
    expect(decided.blockedReason).toMatch(/cleared by Priya Shah/);
    // idempotency: a second decision on a decided matter is refused
    await expect(decideMatter(report.id, { action: "clear", by: "Priya Shah" })).rejects.toThrow(/already cleared/);
  }, 30_000);

  it("AC-6: an approved wall is respected by the next intake check (path shows the wall)", async () => {
    const e1 = EVAL_INTAKES.find((i) => i.id === "e1")!;
    const first = await runIntakePipeline({ text: e1.text, title: e1.title }, { extractor });
    expect(first.paths.length).toBeGreaterThan(0);
    const proposal = await proposeWall(first);
    expect(proposal.screened.map((s) => s.name)).toContain("Priya Shah"); // worked on M-012
    const walled = await decideMatter(first.id, { action: "wall", by: "Mara Quinn", screened: proposal.screened.map((s) => s.name) });
    expect(walled.status).toBe("walled");

    // the NEXT check against the same history sees the standing wall on the path
    const second = await runIntakePipeline({ text: e1.text, title: "re-check after wall" }, { extractor });
    const walledPath = second.paths.find((p) => p.wall !== null);
    expect(walledPath).toBeTruthy();
    expect(walledPath?.wall?.screened).toContain("Priya Shah");
  }, 30_000);

  it("AC-7: an attorney's alias resolution is remembered — the same spelling never asks again", async () => {
    const text = "A new client asks us to pursue R. Kane personally over unpaid invoices.";
    const first = await runIntakePipeline({ text, title: "ambiguous name" }, { extractor });
    expect(first.uncertain.length).toBeGreaterThan(0);
    const u = first.uncertain.find((x) => x.party.name === "R. Kane");
    expect(u?.candidateKey).toBe("p_rkane");

    const decided = await decideMatter(first.id, {
      action: "decline",
      by: "Daniel Osei",
      resolveAliases: { "R. Kane": "p_rkane" },
    });
    expect(decided.status).toBe("declined");

    const second = await runIntakePipeline({ text, title: "ambiguous name, second time" }, { extractor });
    const again = second.uncertain.find((x) => x.party.name === "R. Kane");
    expect(again).toBeUndefined(); // never asked again
    // and the alias now reaches Robert T. Kane's history (officer of Kane Logistics -> declined consult)
    const viaAlias = second.paths.find((p) => p.hops.some((h) => h.rel === "ALIAS_OF"));
    expect(viaAlias).toBeTruthy();
  }, 30_000);

  it("fails closed: clearing with unresolved uncertainty is refused", async () => {
    const text = "A new client asks us to pursue R. Quinn personally over a boundary dispute.";
    const rep = await runIntakePipeline({ text, title: "uncertain clear refused" }, { extractor });
    if (rep.uncertain.length > 0) {
      await expect(decideMatter(rep.id, { action: "clear", by: "Priya Shah" })).rejects.toThrow(/cannot clear/);
    }
  }, 30_000);
});
