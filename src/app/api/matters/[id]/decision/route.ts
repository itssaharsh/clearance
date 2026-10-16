import { decideMatter, DecisionError } from "@/lib/decide";
import { GraphUnavailableError } from "@/lib/graph";
import { DecisionRequest } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^intake_[0-9a-f-]{1,16}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = DecisionRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid decision", issues: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  }
  try {
    const report = await decideMatter(id, parsed.data);
    return Response.json(report);
  } catch (e) {
    if (e instanceof DecisionError) return Response.json({ error: e.message }, { status: 409 });
    if (e instanceof GraphUnavailableError) return Response.json({ error: "graph unavailable: nothing clears while the firm graph is down" }, { status: 503 });
    throw e;
  }
}
