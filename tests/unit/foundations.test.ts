import { describe, expect, it } from "vitest";
import { MockExtractor, selectExtractor } from "@/lib/extract";
import { assertBoundedRead } from "@/lib/graph";
import { IntakeRequest, Party } from "@/lib/schemas";

describe("schemas", () => {
  it("accepts a valid intake and rejects an oversized one", () => {
    expect(IntakeRequest.safeParse({ text: "Kane Logistics wants to sue Meridian Build." }).success).toBe(true);
    expect(IntakeRequest.safeParse({ text: "x".repeat(10_001) }).success).toBe(false);
    expect(IntakeRequest.safeParse({ text: "too short" }).success).toBe(false);
  });
});

describe("MockExtractor", () => {
  const ex = new MockExtractor();
  const text = "New inquiry: Kane Logistics LLC wants to sue Meridian Build over the warehouse contract. Contact Robert T. Kane.";

  it("is deterministic", async () => {
    const a = await ex.extractParties(text);
    const b = await ex.extractParties(text);
    expect(a).toEqual(b);
  });

  it("assigns client and adverse roles from the sue-pattern", async () => {
    const parties = await ex.extractParties(text);
    const names = Object.fromEntries(parties.map((p) => [p.name, p.role]));
    expect(names["Kane Logistics LLC"]).toBe("prospective_client");
    expect(names["Meridian Build"]).toBe("adverse");
    for (const p of parties) Party.parse(p);
  });


  it("fails closed on text with no parties", async () => {
    await expect(ex.extractParties("....")).rejects.toThrow(/extraction unavailable/);
  });
});

describe("graph read guard (AC-11)", () => {
  it("refuses unbounded reads and allows LIMIT or aggregate-only", () => {
    expect(() => assertBoundedRead("MATCH (n) RETURN n")).toThrow(/unbounded/);
    expect(() => assertBoundedRead("MATCH (n) RETURN n LIMIT 50")).not.toThrow();
    expect(() => assertBoundedRead("MATCH (n) RETURN count(n) AS c")).not.toThrow();
  });
});

describe("selectExtractor", () => {
  it("falls back to mock without a key", () => {
    const old = { k: process.env.ANTHROPIC_API_KEY, f: process.env.FEATHERLESS_API_KEY, e: process.env.EXTRACTOR };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.FEATHERLESS_API_KEY;
    delete process.env.EXTRACTOR;
    expect(selectExtractor().mode).toBe("mock");
    if (old.k) process.env.ANTHROPIC_API_KEY = old.k;
    if (old.f) process.env.FEATHERLESS_API_KEY = old.f;
    if (old.e) process.env.EXTRACTOR = old.e;
  });
});
