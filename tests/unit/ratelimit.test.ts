import { describe, expect, it } from "vitest";
import { allowIntake, consumeLlmBudget, llmBudgetAvailable } from "@/lib/ratelimit";

describe("abuse limits", () => {
  it("intake bucket: 5 per minute per IP, then refused, then a new window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(allowIntake("1.2.3.4", t0 + i)).toBe(true);
    expect(allowIntake("1.2.3.4", t0 + 10)).toBe(false);
    expect(allowIntake("5.6.7.8", t0 + 10)).toBe(true); // other IPs unaffected
    expect(allowIntake("1.2.3.4", t0 + 60_001)).toBe(true); // window rolls
  });

  it("LLM daily budget rolls over by date", () => {
    const today = new Date("2026-10-15T10:00:00Z");
    for (let i = 0; i < 25; i++) consumeLlmBudget(today);
    expect(llmBudgetAvailable(today)).toBe(false);
    expect(llmBudgetAvailable(new Date("2026-10-16T00:01:00Z"))).toBe(true);
  });
});
