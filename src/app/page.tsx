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
      <div className="rounded-lg border border-danger/40 bg-danger-container p-6">
        <h1 className="text-lg font-semibold text-danger">Firm graph unavailable</h1>
        <p className="mt-1 text-sm text-danger">
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
          <h1 className="font-display text-2xl tracking-tight">Clearance queue</h1>
          <p className="mt-1 text-sm text-ink-muted">No matter opens until the graph says clean, or a lawyer signs the path it drew.</p>
        </div>
        <Link href="/intake" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-[var(--accent-hover)]">
          New intake
        </Link>
      </div>

      {matters.length === 0 && (
        <div className="rounded-lg border border-line bg-surface-1 p-8 text-center">
          <p className="text-ink-muted">No matters yet.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Run a <Link href="/intake" className="underline">new intake</Link>; three sample inquiries are one click away.
          </p>
        </div>
      )}

      {blocked.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-conflict">Blocked: needs attorney review</h2>
          <ul className="space-y-2">
            {blocked.map((m) => (
              <li key={m.id}>
                <Link href={`/matter/${m.id}`} className="flex items-center justify-between rounded-lg border border-conflict/30 bg-surface-1 p-4 hover:border-conflict">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{m.blockedReason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.pathCount > 0 && <span className="text-sm font-semibold text-conflict">{m.pathCount} path{m.pathCount > 1 ? "s" : ""}</span>}
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
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">Signed clearances</h2>
          <ul className="space-y-2">
            {rest.map((m) => (
              <li key={m.id}>
                <Link href={`/matter/${m.id}`} className="flex items-center justify-between rounded-lg border border-line bg-surface-1 p-4 hover:border-ink-muted">
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
