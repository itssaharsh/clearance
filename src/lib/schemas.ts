import { z } from "zod";

// ---- Contract-first shared schemas (consumed by UI and API; T01) ----

export const PartyKind = z.enum(["person", "org"]);
export const PartyRole = z.enum(["prospective_client", "adverse", "other"]);

export const Party = z.object({
  name: z.string().min(1).max(200),
  kind: PartyKind,
  role: PartyRole,
});
export type Party = z.infer<typeof Party>;

export const ResolutionStatus = z.enum(["matched", "uncertain", "new"]);

export const ResolvedParty = z.object({
  party: Party,
  nodeId: z.string().nullable(), // graph node key when matched
  canonicalName: z.string().nullable(),
  candidateKey: z.string().nullable().default(null), // best candidate's key when uncertain (for attorney resolution)
  confidence: z.number().min(0).max(1),
  status: ResolutionStatus,
});
export type ResolvedParty = z.infer<typeof ResolvedParty>;

export const PathHop = z.object({
  from: z.string(),
  fromKind: z.string(),
  rel: z.string(),
  to: z.string(),
  toKind: z.string(),
  source: z.string(), // provenance: the record that established this edge
  since: z.string(),
  explanation: z.string(), // human-readable, per hop
});
export type PathHop = z.infer<typeof PathHop>;

export const WallInfo = z.object({
  screened: z.array(z.string()),
  by: z.string(),
  since: z.string(),
});
export type WallInfo = z.infer<typeof WallInfo>;

export const ConflictPath = z.object({
  id: z.string(),
  kind: z.enum(["direct_adversity", "corporate_family", "related_person", "declined_consult", "wall"]),
  severity: z.enum(["conflict", "caution"]),
  waivable: z.boolean(),
  hops: z.array(PathHop).min(1),
  wall: WallInfo.nullable().default(null), // an ethical wall already stands around the terminal matter
});

export const WallProposal = z.object({
  matterNames: z.array(z.string()),
  screened: z.array(z.object({ name: z.string(), reason: z.string() })),
});
export type WallProposal = z.infer<typeof WallProposal>;
export type ConflictPath = z.infer<typeof ConflictPath>;

export const MatterStatus = z.enum(["blocked", "cleared", "walled", "declined"]);

export const BaselineResult = z.object({
  query: z.string(),
  hits: z.number().int().min(0),
  hitNames: z.array(z.string()),
});
export type BaselineResult = z.infer<typeof BaselineResult>;

export const MatterReport = z.object({
  id: z.string(),
  title: z.string(),
  status: MatterStatus,
  createdAt: z.string(),
  intakeText: z.string(),
  parties: z.array(ResolvedParty),
  paths: z.array(ConflictPath),
  baseline: z.array(BaselineResult),
  uncertain: z.array(ResolvedParty), // subset needing review; non-empty => blocked
  blockedReason: z.string().nullable(),
});
export type MatterReport = z.infer<typeof MatterReport>;

export const IntakeRequest = z.object({
  text: z.string().min(10).max(10_000), // 10 KB abuse cap enforced in middleware too
  title: z.string().min(1).max(120).optional(),
});
export type IntakeRequest = z.infer<typeof IntakeRequest>;

export const DecisionRequest = z.object({
  action: z.enum(["clear", "decline", "wall"]),
  by: z.string().min(2).max(80),
  note: z.string().max(500).optional(),
  // resolve an uncertain match while deciding: name -> canonical node id (writes ALIAS_OF)
  resolveAliases: z.record(z.string(), z.string()).optional(),
  screened: z.array(z.string()).optional(), // attorney names for a wall
});
export type DecisionRequest = z.infer<typeof DecisionRequest>;

export const AskResult = z.object({
  templateId: z.string(),
  question: z.string(),
  nodes: z.array(z.object({ id: z.string(), label: z.string(), kind: z.string() })),
  edges: z.array(z.object({ from: z.string(), to: z.string(), rel: z.string(), source: z.string() })),
  citations: z.array(z.string()), // matter titles backing the answer
  empty: z.boolean(),
});
export type AskResult = z.infer<typeof AskResult>;

export const Health = z.object({
  graph: z.enum(["up", "down"]),
  extractor: z.enum(["llm", "mock"]),
  seeded: z.boolean(),
});
export type Health = z.infer<typeof Health>;
