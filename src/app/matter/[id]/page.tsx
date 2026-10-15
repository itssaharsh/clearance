import { notFound } from "next/navigation";
import { getMatter } from "@/lib/intake";
import { proposeWall } from "@/lib/decide";
import { BaselinePanel, PartyChips, PathCard, StatusBadge } from "@/components/parts";
import { DecisionPanel } from "@/components/DecisionPanel";

export const dynamic = "force-dynamic";

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let report: Awaited<ReturnType<typeof getMatter>>;
  try {
    report = await getMatter(id);
  } catch {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger-container p-6 text-sm text-danger">
        Firm graph unavailable — Clearance fails closed; this matter stays blocked until the graph is back.
      </div>
    );
  }
  if (!report) notFound();

  let proposal = null;
  if (report.status === "blocked" && report.paths.length > 0) {
    try {
      proposal = await proposeWall(report);
    } catch {
      proposal = null; // graph hiccup: the wall option simply isn't offered; clear/decline still gated by sign-off
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl tracking-tight">{report.title}</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {report.id} · {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className={`mt-4 rounded-lg border p-3 text-sm ${report.status === "blocked" ? "border-danger/40 bg-danger-container text-danger" : "border-success/40 bg-surface-2 text-success"}`}>
        {report.blockedReason ?? "—"}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Parties, as resolved</h2>
        <div className="mt-2">
          <PartyChips parties={report.parties} />
        </div>
        {report.uncertain.length > 0 && (
          <p className="mt-2 rounded-md border border-caution/50 bg-surface-2 p-2 text-sm text-caution">
            Uncertain identity: {report.uncertain.map((u) => `“${u.party.name}” (closest: ${u.canonicalName ?? "—"}, ${Math.round(u.confidence * 100)}%)`).join("; ")}. The system
            does not guess — an attorney resolves this at sign-off, and the answer is remembered.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-conflict">The graph: connection paths</h2>
          {report.paths.length === 0 ? (
            <p className="mt-2 rounded-lg border border-line bg-surface-1 p-4 text-sm text-ink-muted">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Beside it</h2>
          <div className="mt-2">
            <BaselinePanel baseline={report.baseline} />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <DecisionPanel report={report} proposal={proposal} />
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface-1 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Intake text</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{report.intakeText}</p>
      </section>
    </div>
  );
}
