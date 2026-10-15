import { randomUUID } from "node:crypto";
import { roQuery, writeQuery } from "./graph";
import { getMatter, runIntakePipeline } from "./intake";
import { DecisionRequest, MatterReport, WallProposal } from "./schemas";
import { z } from "zod";

/**
 * T05: the gate's decisions. Everything here writes records the firm keeps:
 * Clearance nodes (who/when/what was seen), Wall nodes (who is screened),
 * ALIAS_OF edges and declared-new entities (ask-once memory). The model plays
 * no part in any of it.
 */

export class DecisionError extends Error {}

/** Wall proposal: who worked on the implicated matters is who must be screened. */
export async function proposeWall(report: MatterReport): Promise<WallProposal> {
  const matters = [...new Set(report.paths.map((p) => p.hops[p.hops.length - 1].to))];
  const screened: Array<{ name: string; reason: string }> = [];
  for (const m of matters) {
    const rows = await roQuery<{ name: string }>(
      `MATCH (a:Attorney)-[:WORKED_ON]->(m:Matter {name: $m}) RETURN a.name AS name LIMIT 20`,
      { m },
    );
    for (const r of rows) {
      if (!screened.some((s) => s.name === r.name)) screened.push({ name: r.name, reason: `worked on ${m}` });
    }
  }
  return WallProposal.parse({ matterNames: matters, screened });
}

/** Ask-once alias memory: an attorney's resolution becomes an ALIAS_OF edge; the same name never asks again. */
async function writeAliases(resolveAliases: Record<string, string>, by: string, matterId: string): Promise<void> {
  for (const [aliasName, canonicalKey] of Object.entries(resolveAliases)) {
    const found = await roQuery<{ c: number }>(`MATCH (c {key: $canonicalKey}) RETURN count(c) AS c`, { canonicalKey });
    if (Number(found[0]?.c ?? 0) === 0) throw new DecisionError(`cannot resolve "${aliasName}": the chosen record no longer exists`);
    const aliasKey = `alias_${randomUUID().slice(0, 8)}`;
    await writeQuery(
      `MATCH (c {key: $canonicalKey})
       MERGE (a:Person {name: $aliasName})
       ON CREATE SET a.key = $aliasKey
       MERGE (a)-[r:ALIAS_OF]->(c)
       SET r.source = $source, r.since = $since`,
      {
        canonicalKey,
        aliasName,
        aliasKey,
        source: `attorney resolution by ${by} on ${matterId}`,
        since: new Date().toISOString().slice(0, 7),
      },
    );
  }
}

/** Declared-new entities become nodes, so the same name exact-matches next time (ask-once, B3 fix). */
async function writeNewEntities(names: string[], report: MatterReport, by: string): Promise<void> {
  for (const name of names) {
    const u = report.uncertain.find((x) => x.party.name === name);
    const label = u?.party.kind === "person" ? "Person" : "Org";
    await writeQuery(
      `MERGE (n:${label} {name: $name}) ON CREATE SET n.key = $key, n.note = $note`,
      { name, key: `new_${randomUUID().slice(0, 8)}`, note: `declared new by ${by} on ${report.id}` },
    );
  }
}

export async function decideMatter(id: string, input: z.infer<typeof DecisionRequest>): Promise<MatterReport> {
  const req = DecisionRequest.parse(input);
  let report = await getMatter(id);
  if (!report) throw new DecisionError("matter not found");
  if (report.status !== "blocked") throw new DecisionError(`matter is already ${report.status} (decisions are idempotent: re-deciding is refused)`);

  // 1) resolve uncertain identities first (ask-once memory), then re-run the check under the SAME matter id (B4)
  const hasAliases = req.resolveAliases && Object.keys(req.resolveAliases).length > 0;
  const hasNew = req.markNew && req.markNew.length > 0;
  if (hasAliases) await writeAliases(req.resolveAliases!, req.by, id);
  if (hasNew) await writeNewEntities(req.markNew!, report, req.by);
  if (hasAliases || hasNew) {
    report = await runIntakePipeline(
      { text: report.intakeText, title: report.title },
      { reportId: report.id, createdAt: report.createdAt },
    );
  }

  // 2) the gate: a clear with unresolved uncertainty is refused (fails closed)
  if (req.action === "clear" && report.uncertain.length > 0) {
    throw new DecisionError(`cannot clear: uncertain identity remains (${report.uncertain.map((u) => u.party.name).join(", ")})`);
  }

  const at = new Date().toISOString();
  const decisionKey = `dec_${randomUUID().slice(0, 8)}`;

  if (req.action === "wall") {
    const screened = req.screened ?? [];
    if (screened.length === 0) throw new DecisionError("a wall needs at least one screened attorney");
    // M2 fix: a wall that silently screens nobody is worse than no wall — verify every name
    const known = await roQuery<{ name: string }>(`MATCH (a:Attorney) WHERE a.name IN $names RETURN a.name AS name LIMIT 50`, { names: screened });
    const missing = screened.filter((s) => !known.some((k) => k.name === s));
    if (missing.length > 0) throw new DecisionError(`unknown attorney name(s): ${missing.join(", ")} — the wall was not created`);
    const matters = [...new Set(report.paths.map((p) => p.hops[p.hops.length - 1].to))];
    await writeQuery(
      `MATCH (i:Intake {key: $id})
       MERGE (w:Wall {key: $decisionKey})
       SET w.by = $by, w.at = $at, w.note = $note
       MERGE (w)-[:GUARDS]->(i)
       WITH w
       UNWIND $screened AS sname
       MATCH (a:Attorney {name: sname})
       MERGE (w)-[:SCREENED_BY]->(a)
       WITH w
       UNWIND $matters AS mname
       MATCH (m:Matter {name: mname})
       MERGE (w)-[:AROUND]->(m)`,
      { id, decisionKey, by: req.by, at, note: req.note ?? "", screened, matters },
    );
  } else {
    await writeQuery(
      `MATCH (i:Intake {key: $id})
       MERGE (c:Clearance {key: $decisionKey})
       SET c.by = $by, c.at = $at, c.action = $action, c.note = $note, c.pathsSeen = $pathsSeen
       MERGE (c)-[:CLEARS]->(i)`,
      { id, decisionKey, by: req.by, at, action: req.action, note: req.note ?? "", pathsSeen: JSON.stringify(report.paths.map((p) => p.id)) },
    );
  }

  const newStatus = req.action === "clear" ? "cleared" : req.action === "decline" ? "declined" : "walled";
  const updated: MatterReport = MatterReport.parse({ ...report, status: newStatus, blockedReason: decisionLine(req, at) });
  await writeQuery(`MATCH (i:Intake {key: $id}) SET i.status = $status, i.report = $report`, {
    id,
    status: newStatus,
    report: JSON.stringify(updated),
  });
  return updated;
}

function decisionLine(req: z.infer<typeof DecisionRequest>, at: string): string {
  const when = at.slice(0, 16).replace("T", " ");
  if (req.action === "clear") return `cleared by ${req.by} at ${when} — signed with the drawn paths on record`;
  if (req.action === "decline") return `declined by ${req.by} at ${when}`;
  return `ethical wall approved by ${req.by} at ${when} — screened: ${(req.screened ?? []).join(", ")}`;
}
