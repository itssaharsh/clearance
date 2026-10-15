import { beforeAll, describe, expect, it } from "vitest";
import { resetGraph } from "@/lib/corpus-load";
import { runAsk, ASK_TEMPLATES } from "@/lib/ask-templates";

const live = Boolean(process.env.FALKORDB_URL);
const d = describe.skipIf(!live);

d("Ask the firm (AC-10)", () => {
  beforeAll(async () => {
    await resetGraph();
  }, 60_000);

  it("touched_family cites M-012 for a Meridian question and includes the subsidiary", async () => {
    const r = await runAsk("touched_family", "Meridian");
    expect(r.empty).toBe(false);
    expect(r.citations.some((c) => c.includes("Meridian Group"))).toBe(true);
    expect(r.nodes.some((n) => n.label === "Meridian Build")).toBe(true); // reached via SUBSIDIARY_OF
    expect(r.edges.every((e) => e.rel.length > 0)).toBe(true);
  }, 30_000);

  it("every template answers deterministically (same question, same answer, twice)", async () => {
    for (const t of ASK_TEMPLATES) {
      const a = await runAsk(t.id, t.defaultParam);
      const b = await runAsk(t.id, t.defaultParam);
      expect(a).toEqual(b);
    }
  }, 60_000);

  it("an unknown name returns an honest empty, not an invention", async () => {
    const r = await runAsk("attorney_history", "Zyzzlvaria Holdings");
    expect(r.empty).toBe(true);
    expect(r.citations).toEqual([]);
  }, 30_000);
});
