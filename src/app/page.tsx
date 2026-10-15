import Link from "next/link";
import { listMatters } from "@/lib/intake";
import { StatusBadge } from "@/components/parts";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  let matters: Awaited<ReturnType<typeof listMatters>> | null = null;
  try {
    matters = await listMatters();
  } catch {
    matters = null;
  }

  if (matters === null) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">Firm graph unavailable</h1>
        <p className="mt-1 text-sm text-red-800">
          Clearance fails closed: while FalkorDB is unreachable, nothing can be checked and nothing clears. Set FALKORDB_URL and seed the demo firm (`npm run seed`).
        </p>
      </div>
    );
  }

  const blocked = matters.filter((m) => m.status === "blocked");
  const rest = matters.filter((m) => m.status !== "blocked");

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clearance queue</h1>
          <p className="mt-1 text-sm text-zinc-600">No matter opens until the graph says clean — or a lawyer signs the path it drew.</p>
        </div>
        <Link href="/intake" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
          New intake
        </Link>
      </div>

      {matters.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-600">No matters yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Run a <Link href="/intake" className="underline">new intake</Link> — three sample inquiries are one click away.
          </p>
        </div>
      )}

      {blocked.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-700">Blocked — needs attorney review</h2>
          <ul className="space-y-2">
            {blocked.map((m) => (
              <li key={m.id}>
                <Link href={`/matter/${m.id}`} className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4 hover:border-red-400">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{m.blockedReason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.pathCount > 0 && <span className="text-sm font-semibold text-red-700">{m.pathCount} path{m.pathCount > 1 ? "s" : ""}</span>}
                    <StatusBadge status={m.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Signed clearances</h2>
          <ul className="space-y-2">
            {rest.map((m) => (
              <li key={m.id}>
                <Link href={`/matter/${m.id}`} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400">
                  <p className="font-medium">{m.title}</p>
                  <StatusBadge status={m.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
