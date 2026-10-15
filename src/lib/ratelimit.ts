/**
 * Abuse limits (contract Constraints): in-memory per-instance token buckets.
 * Good enough for a demo deployment; a judge hammering refresh sees 429s, not a bill.
 */

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const INTAKE_PER_MIN = 5;

export function allowIntake(ip: string, now = Date.now()): boolean {
  const b = buckets.get(ip);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (b.count >= INTAKE_PER_MIN) return false;
  b.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "local").trim() || "local";
}

// ---- live-LLM daily budget (20/day; beyond it extraction falls back to mock) ----
const LLM_DAILY_CAP = Number(process.env.LLM_DAILY_CAP ?? 20);
let llmDay = "";
let llmUsed = 0;

export function llmBudgetAvailable(now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  if (day !== llmDay) {
    llmDay = day;
    llmUsed = 0;
  }
  return llmUsed < LLM_DAILY_CAP;
}

export function consumeLlmBudget(now = new Date()): void {
  const day = now.toISOString().slice(0, 10);
  if (day !== llmDay) {
    llmDay = day;
    llmUsed = 0;
  }
  llmUsed += 1;
}
