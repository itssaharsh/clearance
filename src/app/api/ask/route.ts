import { runAsk } from "@/lib/ask-templates";
import { GraphUnavailableError } from "@/lib/graph";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tid = url.searchParams.get("tid") ?? "";
  const param = (url.searchParams.get("param") ?? "").slice(0, 120);
  try {
    const result = await runAsk(tid, param);
    return Response.json(result);
  } catch (e) {
    if (e instanceof GraphUnavailableError) return Response.json({ error: "graph unavailable" }, { status: 503 });
    if (e instanceof Error && e.message === "unknown template") return Response.json({ error: "unknown template" }, { status: 400 });
    throw e;
  }
}
