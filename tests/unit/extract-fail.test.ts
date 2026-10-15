import { describe, expect, it } from "vitest";
import { runIntakePipeline } from "@/lib/intake";
import type { Extractor } from "@/lib/extract";
import { ExtractUnavailableError } from "@/lib/extract";

const failingExtractor: Extractor = {
  mode: "mock",
  async extractParties() {
    throw new ExtractUnavailableError("simulated timeout");
  },
};

describe("intake pipeline failure path (AC-4: fails closed)", () => {
  it("extractor failure yields a blocked matter report with the reason, never cleared", async () => {
    const report = await runIntakePipeline(
      { text: "Kane Logistics LLC wants to sue Meridian Build over the warehouse." },
      { extractor: failingExtractor, graphAvailable: false },
    );
    expect(report.status).toBe("blocked");
    expect(report.blockedReason).toMatch(/extraction unavailable/);
    expect(report.paths).toEqual([]);
    expect(report.parties).toEqual([]);
  });

  it("graph unavailable yields blocked with graph reason (never cleared)", async () => {
    const okExtractor: Extractor = {
      mode: "mock",
      async extractParties() {
        return [{ name: "Tern Freight", kind: "org", role: "prospective_client" }];
      },
    };
    const report = await runIntakePipeline(
      { text: "Tern Freight wants to sue Meridian Group over the depot lease." },
      { extractor: okExtractor, graphAvailable: false },
    );
    expect(report.status).toBe("blocked");
    expect(report.blockedReason).toMatch(/graph unavailable/);
  });
});
