import { describe, expect, it } from "vitest";
import { ExtractUnavailableError, FallbackExtractor, MockExtractor, selectExtractor } from "@/lib/extract";
import type { Extractor } from "@/lib/extract";
import { runIntakePipeline } from "@/lib/intake";

const HERO = "Kane Logistics LLC wants to sue Meridian Build over the Riverside warehouse contract.";

const failing = (cause: string): Extractor => ({
  mode: "llm",
  async extractParties() {
    throw new ExtractUnavailableError(cause);
  },
});

describe("live extraction falls back to the deterministic extractor", () => {
  it("a cold or failed model hands the intake to the deterministic extractor", async () => {
    const parties = await new FallbackExtractor(failing("timeout"), new MockExtractor()).extractParties(HERO);
    const names = parties.map((p) => p.name);
    expect(names).toContain("Kane Logistics LLC");
    expect(names).toContain("Meridian Build");
  });

  it("a model that answers is used as-is; the fallback is never consulted", async () => {
    const model: Extractor = {
      mode: "llm",
      async extractParties() {
        return [{ name: "Tern Freight", kind: "org", role: "prospective_client" }];
      },
    };
    const parties = await new FallbackExtractor(model, failing("must not be called")).extractParties(HERO);
    expect(parties.map((p) => p.name)).toEqual(["Tern Freight"]);
  });

  it("when both fail, the matter still fails closed", async () => {
    const both = new FallbackExtractor(failing("timeout"), failing("no parties found"));
    const report = await runIntakePipeline({ text: HERO }, { extractor: both, graphAvailable: false });
    expect(report.status).toBe("blocked");
    expect(report.blockedReason).toMatch(/extraction unavailable/);
  });

  it("an unexpected error is not swallowed by the fallback", async () => {
    const buggy: Extractor = {
      mode: "llm",
      async extractParties() {
        throw new TypeError("bug");
      },
    };
    await expect(new FallbackExtractor(buggy, new MockExtractor()).extractParties(HERO)).rejects.toBeInstanceOf(TypeError);
  });

  it("with a provider key, the live extractor is the fallback-wrapped model", () => {
    const old = { f: process.env.FEATHERLESS_API_KEY, e: process.env.EXTRACTOR };
    process.env.FEATHERLESS_API_KEY = "test-key";
    delete process.env.EXTRACTOR;
    const x = selectExtractor();
    expect(x).toBeInstanceOf(FallbackExtractor);
    expect(x.mode).toBe("llm");
    if (old.f) process.env.FEATHERLESS_API_KEY = old.f;
    else delete process.env.FEATHERLESS_API_KEY;
    if (old.e) process.env.EXTRACTOR = old.e;
  });
});
