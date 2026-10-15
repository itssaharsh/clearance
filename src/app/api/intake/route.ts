import { runIntakePipeline } from "@/lib/intake";
import { IntakeRequest } from "@/lib/schemas";
import { allowIntake, clientIp } from "@/lib/ratelimit";

export async function POST(request: Request) {
  if (!allowIntake(clientIp(request))) {
    return Response.json({ error: "rate limit: 5 intakes per minute — wait a moment" }, { status: 429 });
  }
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > 12_000) return Response.json({ error: "intake too large (10 KB cap)" }, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = IntakeRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid intake", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }
  const report = await runIntakePipeline(parsed.data);
  return Response.json(report, { status: 201 });
}
