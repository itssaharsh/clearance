import { resetGraph } from "@/lib/corpus-load";
import { GraphUnavailableError } from "@/lib/graph";

/** Token-guarded demo reset (AC-12): restores the exact seeded corpus. */
export async function POST(request: Request) {
  const token = process.env.RESET_TOKEN;
  if (!token) return Response.json({ error: "reset disabled (no RESET_TOKEN configured)" }, { status: 403 });
  if (request.headers.get("x-reset-token") !== token) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const { nodes, edges } = await resetGraph();
    return Response.json({ reset: true, nodes, edges });
  } catch (e) {
    if (e instanceof GraphUnavailableError) return Response.json({ error: "graph unavailable" }, { status: 503 });
    throw e;
  }
}
