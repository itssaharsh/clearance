import { listMatters } from "@/lib/intake";
import { GraphUnavailableError } from "@/lib/graph";

export async function GET() {
  try {
    return Response.json({ matters: await listMatters() });
  } catch (e) {
    if (e instanceof GraphUnavailableError) {
      return Response.json({ error: "graph unavailable", matters: [] }, { status: 503 });
    }
    throw e;
  }
}
