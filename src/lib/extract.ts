import { Party, PartyKind, PartyRole } from "./schemas";
import { consumeLlmBudget, llmBudgetAvailable } from "./ratelimit";
import { z } from "zod";

/** Raised on any extractor failure (refusal, malformed output, timeout, quota). Callers fail closed: matter stays blocked. */
export class ExtractUnavailableError extends Error {
  constructor(cause: string) {
    super(`extraction unavailable: ${cause}`);
    this.name = "ExtractUnavailableError";
  }
}

export interface Extractor {
  readonly mode: "llm" | "mock";
  extractParties(text: string): Promise<Party[]>;
}

// ---------------------------------------------------------------- Mock ----
// Deterministic: same text in, same parties out — demo-safe and unit-testable.

const ORG_HINTS = /\b(llc|inc|ltd|corp|co|group|logistics|holdings|partners|build|builders|law|labs|systems)\b\.?$/i;

function properNounRuns(text: string): string[] {
  const runs = text.match(/\b([A-Z][\w&.']*(?:\s+(?:[A-Z][\w&.']*|of|and|the|&))*)/g) ?? [];
  return runs.map((r) => r.trim()).filter((r) => r.length > 2 && r.split(/\s+/).length <= 5);
}

export class MockExtractor implements Extractor {
  readonly mode = "mock" as const;

  async extractParties(text: string): Promise<Party[]> {
    const parties = new Map<string, Party>();
    const add = (name: string, role: z.infer<typeof PartyRole>) => {
      const clean = name.replace(/[.,;:]$/, "").trim();
      if (!clean || /^(The|Our|We|They|New|Prospective|Primary|Contact|Inquiry|Dear|Mr|Ms|Monday|Tuesday|Wednesday|Thursday|Friday)$/i.test(clean)) return;
      const kind: z.infer<typeof PartyKind> = ORG_HINTS.test(clean) || /\b(LLC|Inc|Ltd|Corp|Group)\b/.test(clean) ? "org" : clean.split(/\s+/).length >= 2 ? "person" : "org";
      if (!parties.has(clean.toLowerCase())) parties.set(clean.toLowerCase(), Party.parse({ name: clean, kind, role }));
    };

    // Work sentence by sentence; a period ends a sentence only after a 2+-letter
    // word, so initials ("R. Kane") never truncate the adverse party.
    const sentences = text.split(/(?<=[A-Za-z]{2}[.!?])\s+/);
    for (const sent of sentences) {
      // "<X> wants to sue <Y>", "<X> v. <Y>", "against <Y>", "pursue <Y>"
      const sue = sent.match(/(.+?)\s+(?:wants to sue|is suing|sues|v\.|vs\.?|against|to pursue|pursuing|to recover from)\s+(.+?)(?:[;\n]|$)/i);
      if (sue) {
        for (const n of properNounRuns(sue[1])) add(n, "prospective_client");
        for (const n of properNounRuns(sue[2])) add(n, "adverse");
      }
      const rep = sent.match(/represent(?:ing)?\s+(.+?)(?:[;\n]|$)/i);
      if (rep) for (const n of properNounRuns(rep[1])) add(n, "prospective_client");
    }
    // everything else capitalized becomes "other" so resolution still sees it
    for (const n of properNounRuns(text)) if (![...parties.keys()].includes(n.toLowerCase())) add(n, "other");

    const out = [...parties.values()];
    if (out.length === 0) throw new ExtractUnavailableError("no parties found in intake text");
    return out;
  }

}

// ----------------------------------------------------------------- LLM ----

const LLMParties = z.object({
  parties: z.array(z.object({ name: z.string(), kind: PartyKind, role: PartyRole })).min(1),
});

export class LLMExtractor implements Extractor {
  readonly mode = "llm" as const;

  async extractParties(text: string): Promise<Party[]> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ExtractUnavailableError("no API key configured");
    consumeLlmBudget();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
          max_tokens: 700,
          system:
            'Extract the parties from a law-firm intake note. Reply with ONLY JSON: {"parties":[{"name":string,"kind":"person"|"org","role":"prospective_client"|"adverse"|"other"}]}. Include every person and organisation named. No commentary.',
          messages: [{ role: "user", content: text.slice(0, 10_000) }],
        }),
      });
      if (!res.ok) throw new ExtractUnavailableError(`provider ${res.status}`);
      const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      const raw = body.content?.find((c) => c.type === "text")?.text ?? "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = LLMParties.safeParse(JSON.parse(json));
      if (!parsed.success) throw new ExtractUnavailableError("malformed model output");
      return parsed.data.parties.map((p) => Party.parse(p));
    } catch (e) {
      if (e instanceof ExtractUnavailableError) throw e;
      throw new ExtractUnavailableError(e instanceof Error ? e.name === "AbortError" ? "timeout" : e.message : "unknown");
    } finally {
      clearTimeout(timer);
    }
  }

}

export function selectExtractor(): Extractor {
  const pref = process.env.EXTRACTOR;
  if (pref === "mock") return new MockExtractor();
  // credit-safe: beyond the daily live budget, extraction falls back to the deterministic mock
  if (pref === "llm") return llmBudgetAvailable() ? new LLMExtractor() : new MockExtractor();
  return process.env.ANTHROPIC_API_KEY && llmBudgetAvailable() ? new LLMExtractor() : new MockExtractor();
}
