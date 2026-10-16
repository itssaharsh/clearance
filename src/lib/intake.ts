import { randomUUID } from "node:crypto";
import { ExtractUnavailableError, selectExtractor, type Extractor } from "./extract";
import { GraphUnavailableError, roQuery, writeQuery } from "./graph";
import { baselineSearch } from "./baseline";
import { conflictPathsFor } from "./paths";
import { loadDirectory, resolveAgainstDirectory } from "./resolve";
import { IntakeRequest, MatterReport, type ResolvedParty } from "./schemas";
import { z } from "zod";

type PipelineOptions = {
  extractor?: Extractor;
  /** test seam: set false to simulate FalkorDB being down without a connection attempt */
  graphAvailable?: boolean;
  /** re-run after an attorney resolution keeps the matter's identity (B4 fix) */
  reportId?: string;
  createdAt?: string;
};

/**
 * J1: intake text -> parties -> resolution (fails closed) -> conflict paths +
 * baseline -> blocked matter report. Every failure lands on `blocked`, never on
 * `cleared` (AC-3, AC-4, ADR-0004). Only uncertainty about the matter's own
 * parties (prospective client / adverse) blocks; stray nouns never do (B1 fix).
 */
export async function runIntakePipeline(input: z.infer<typeof IntakeRequest>, opts: PipelineOptions = {}): Promise<MatterReport> {
  const req = IntakeRequest.parse(input);
  const id = opts.reportId ?? `intake_${randomUUID().slice(0, 8)}`;
  const createdAt = opts.createdAt ?? new Date().toISOString();
  const title = req.title ?? req.text.slice(0, 80);
  const base = {
    id,
    title,
    status: "blocked" as const,
    createdAt,
    intakeText: req.text,
    parties: [] as ResolvedParty[],
    paths: [],
    baseline: [],
    uncertain: [] as ResolvedParty[],
  };

  const extractor = opts.extractor ?? selectExtractor();

  let parties;
  try {
    parties = await extractor.extractParties(req.text);
  } catch (e) {
    const reason = e instanceof ExtractUnavailableError ? e.message : `extraction unavailable: ${String(e)}`;
    const report = { ...base, blockedReason: reason, persisted: false };
    if (opts.graphAvailable !== false) {
      try {
        await persistReport(MatterReport.parse(report));
        report.persisted = true;
      } catch {
        /* graph down too: stays unpersisted; the UI shows it inline */
      }
    }
    return MatterReport.parse(report);
  }

  if (opts.graphAvailable === false) {
    return MatterReport.parse({ ...base, blockedReason: "graph unavailable: cannot clear any matter while the firm graph is unreachable", persisted: false });
  }

  try {
    const directory = await loadDirectory();
    const resolved = [];
    for (const p of parties) resolved.push(await resolveAgainstDirectory(p, directory));
    // only the matter's own parties can block on identity; stray nouns are informational
    const uncertain = resolved.filter((r) => r.status === "uncertain" && r.party.role !== "other");

    const paths = [];
    for (const r of resolved) {
      if (r.nodeId) paths.push(...(await conflictPathsFor(r.nodeId)));
    }

    const baseline = [];
    for (const r of resolved) if (r.party.role !== "other") baseline.push(await baselineSearch(r.party.name));

    const blockedReason =
      uncertain.length > 0
        ? `uncertain identity: ${uncertain.map((u) => u.party.name).join(", ")}. Needs review`
        : paths.length > 0
          ? `${paths.length} connection path(s) found. Needs attorney sign-off`
          : "no conflict found. Awaiting attorney sign-off";

    const report = MatterReport.parse({ ...base, parties: resolved, paths, baseline, uncertain, blockedReason });
    await persistReport(report);
    return report;
  } catch (e) {
    if (e instanceof GraphUnavailableError) {
      return MatterReport.parse({ ...base, blockedReason: "graph unavailable: cannot clear any matter while the firm graph is unreachable", persisted: false });
    }
    throw e;
  }
}

/** Intake matters live in the same graph under their own label (the gate's record). */
export async function persistReport(report: MatterReport): Promise<void> {
  await writeQuery(
    `MERGE (i:Intake {key: $id}) SET i.title = $title, i.status = $status, i.createdAt = $createdAt, i.report = $report`,
    { id: report.id, title: report.title, status: report.status, createdAt: report.createdAt, report: JSON.stringify(report) },
  );
}

export async function listMatters(): Promise<Array<Pick<MatterReport, "id" | "title" | "status" | "createdAt" | "blockedReason"> & { pathCount: number }>> {
  const rows = await roQuery<{ report: string }>(`MATCH (i:Intake) RETURN i.report AS report ORDER BY i.createdAt DESC LIMIT 100`);
  return rows.map((r) => {
    const rep = MatterReport.parse(JSON.parse(r.report));
    return { id: rep.id, title: rep.title, status: rep.status, createdAt: rep.createdAt, blockedReason: rep.blockedReason, pathCount: rep.paths.length };
  });
}

export async function getMatter(id: string): Promise<MatterReport | null> {
  const rows = await roQuery<{ report: string }>(`MATCH (i:Intake {key: $id}) RETURN i.report AS report LIMIT 1`, { id });
  if (rows.length === 0) return null;
  return MatterReport.parse(JSON.parse(rows[0].report));
}
