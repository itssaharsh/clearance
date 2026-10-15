import { getMatter } from "@/lib/intake";
import { GraphUnavailableError } from "@/lib/graph";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^intake_[0-9a-f-]{1,16}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    const report = await getMatter(id);
    if (!report) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(report);
  } catch (e) {
    if (e instanceof GraphUnavailableError) return Response.json({ error: "graph unavailable" }, { status: 503 });
    throw e;
  }
}
