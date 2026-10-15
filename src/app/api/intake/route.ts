import { runIntakePipeline } from "@/lib/intake";
import { IntakeRequest } from "@/lib/schemas";

export async function POST(request: Request) {
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
