import { notFound } from "next/navigation";
import { getMatter } from "@/lib/intake";
import { BaselinePanel, PartyChips, PathCard, StatusBadge } from "@/components/parts";

export const dynamic = "force-dynamic";

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let report: Awaited<ReturnType<typeof getMatter>>;
  try {
    report = await getMatter(id);
  } catch {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800">
        Firm graph unavailable — Clearance fails closed; this matter stays blocked until the graph is back.
      </div>
    );
  }
  if (!report) notFound();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{report.title}</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {report.id} · {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className={`mt-4 rounded-lg border p-3 text-sm ${report.status === "blocked" ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
        {report.blockedReason ?? "—"}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Parties, as resolved</h2>
        <div className="mt-2">
          <PartyChips parties={report.parties} />
        </div>
        {report.uncertain.length > 0 && (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
            Uncertain identity: {report.uncertain.map((u) => `“${u.party.name}” (closest: ${u.canonicalName ?? "—"}, ${Math.round(u.confidence * 100)}%)`).join("; ")}. The system
            does not guess — an attorney resolves this at sign-off, and the answer is remembered.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">The graph: connection paths</h2>
          {report.paths.length === 0 ? (
            <p className="mt-2 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No path from any party to the firm's history within 3 hops. A negative result here is an actual traversal, not a similarity score.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {report.paths.map((p) => (
                <PathCard key={p.id} path={p} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Beside it</h2>
          <div className="mt-2">
            <BaselinePanel baseline={report.baseline} />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Intake text</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{report.intakeText}</p>
      </section>
    </div>
  );
}
