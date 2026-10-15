import { graphUp, roQuery } from "@/lib/graph";
import { selectExtractor } from "@/lib/extract";
import { Health } from "@/lib/schemas";

export async function GET() {
  const up = await graphUp();
  let seeded = false;
  if (up) {
    try {
      const rows = await roQuery<{ c: number }>("MATCH (m:Matter) RETURN count(m) AS c");
      seeded = Number(rows[0]?.c ?? 0) > 0;
    } catch {
      seeded = false;
    }
  }
  const body = Health.parse({ graph: up ? "up" : "down", extractor: selectExtractor().mode, seeded });
  return Response.json(body, { status: up ? 200 : 503 });
}
