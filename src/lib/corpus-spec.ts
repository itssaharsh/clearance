// Synthetic firm corpus — deterministic, hand-authored planted conflicts plus
// seeded procedural filler. Entirely fictional (Rule 6). The PLANTED manifest
// is the ground truth the eval script (AC-8) scores against.

export type NodeSpec =
  | { label: "Attorney"; key: string; name: string }
  | { label: "Person"; key: string; name: string }
  | { label: "Org"; key: string; name: string }
  | { label: "Matter"; key: string; title: string; year: number; status: "closed" | "active" };

export type EdgeSpec = {
  type: "ALIAS_OF" | "SUBSIDIARY_OF" | "RELATED_TO" | "CLIENT_IN" | "ADVERSE_IN" | "WITNESS_IN" | "DECLINED_CONSULT" | "WORKED_ON";
  from: string; // node key
  to: string;
  source: string; // provenance: the record that established this edge
  since: string;
  relType?: "family" | "officer"; // for RELATED_TO
};

export type EvalIntake = {
  id: string;
  title: string;
  text: string;
  /** conflict path kinds the engine must find (ground truth) */
  expectPaths: Array<{ kind: string; via: string }>;
  /** how many of those a literal name search over firm records also finds */
  baselineFinds: number;
};

// ------------------------------------------------------------- attorneys ---
export const ATTORNEYS: NodeSpec[] = [
  { label: "Attorney", key: "att_shah", name: "Priya Shah" },
  { label: "Attorney", key: "att_osei", name: "Daniel Osei" },
  { label: "Attorney", key: "att_quinn", name: "Mara Quinn" },
];

// ---------------------------------------------------- planted entity web ---
export const PLANTED_NODES: NodeSpec[] = [
  // 1) Corporate family: Meridian Build (new adverse) -> subsidiary of Meridian Group (current client M-012)
  { label: "Org", key: "org_meridian_group", name: "Meridian Group" },
  { label: "Org", key: "org_meridian_build", name: "Meridian Build" },
  { label: "Matter", key: "m012", title: "Meridian Group — lease portfolio restructuring", year: 2025, status: "active" },

  // 2) Declined consult: Kane Logistics LLC consulted in 2024, declined; officer Robert T. Kane
  { label: "Org", key: "org_kane", name: "Kane Logistics LLC" },
  { label: "Person", key: "p_rkane", name: "Robert T. Kane" },
  { label: "Matter", key: "m031", title: "Declined consultation — freight contract dispute", year: 2024, status: "closed" },

  // 3) Alias chain: Northgate & Co renamed to Northgate Partners; adverse in M-008
  { label: "Org", key: "org_northgate_new", name: "Northgate Partners" },
  { label: "Org", key: "org_northgate_old", name: "Northgate & Co" },
  { label: "Matter", key: "m008", title: "Hartwell v. Northgate Partners — construction defect", year: 2023, status: "closed" },
  { label: "Org", key: "org_hartwell", name: "Hartwell Property Trust" },

  // 4) Related person: Elena Vasquez is married to current client Marco Vasquez (M-019)
  { label: "Person", key: "p_marco", name: "Marco Vasquez" },
  { label: "Person", key: "p_elena", name: "Elena Vasquez" },
  { label: "Matter", key: "m019", title: "Marco Vasquez — equity partner buy-in", year: 2026, status: "active" },

  // Decoy: similar name that must NOT match (resolution precision)
  { label: "Org", key: "org_kane_sons", name: "Kane & Sons Plumbing" },
];

export const PLANTED_EDGES: EdgeSpec[] = [
  { type: "SUBSIDIARY_OF", from: "org_meridian_build", to: "org_meridian_group", source: "companies-register extract, matter M-012 KYC file", since: "2024-03" },
  { type: "CLIENT_IN", from: "org_meridian_group", to: "m012", source: "engagement letter M-012", since: "2025-02" },
  { type: "WORKED_ON", from: "att_shah", to: "m012", source: "timekeeping M-012", since: "2025-02" },
  { type: "WORKED_ON", from: "att_osei", to: "m012", source: "timekeeping M-012", since: "2025-04" },

  { type: "DECLINED_CONSULT", from: "org_kane", to: "m031", source: "intake log 2024-06-11", since: "2024-06" },
  { type: "RELATED_TO", from: "p_rkane", to: "org_kane", source: "consult notes 2024-06-11 (signed as managing officer)", since: "2024-06", relType: "officer" },
  { type: "WORKED_ON", from: "att_quinn", to: "m031", source: "intake log 2024-06-11", since: "2024-06" },

  { type: "ALIAS_OF", from: "org_northgate_old", to: "org_northgate_new", source: "rename notice in M-008 correspondence", since: "2023-09" },
  { type: "ADVERSE_IN", from: "org_northgate_new", to: "m008", source: "pleadings M-008", since: "2023-05" },
  { type: "CLIENT_IN", from: "org_hartwell", to: "m008", source: "engagement letter M-008", since: "2023-05" },
  { type: "WORKED_ON", from: "att_shah", to: "m008", source: "timekeeping M-008", since: "2023-05" },

  { type: "RELATED_TO", from: "p_elena", to: "p_marco", source: "client intake form M-019 (spouse disclosure)", since: "2026-01", relType: "family" },
  { type: "CLIENT_IN", from: "p_marco", to: "m019", source: "engagement letter M-019", since: "2026-01" },
  { type: "WORKED_ON", from: "att_osei", to: "m019", source: "timekeeping M-019", since: "2026-01" },
];

// ------------------------------------------------------------ eval set -----
// 8 intakes, 12 expected conflict paths; a literal name search finds 4 of 12.
export const EVAL_INTAKES: EvalIntake[] = [
  {
    id: "e1",
    title: "Warehouse suit vs Meridian Build",
    text: "Kane Logistics LLC wants to sue Meridian Build over the Riverside warehouse contract. Primary contact Robert T. Kane.",
    expectPaths: [
      { kind: "corporate_family", via: "Meridian Build -> SUBSIDIARY_OF -> Meridian Group -> CLIENT_IN -> M-012" },
      { kind: "declined_consult", via: "Kane Logistics LLC -> DECLINED_CONSULT -> M-031" },
    ],
    baselineFinds: 0,
  },
  {
    id: "e2",
    title: "Suit against Meridian Group directly",
    text: "Prospective client Tern Freight wants to sue Meridian Group for breach of the depot lease.",
    expectPaths: [{ kind: "direct_adversity", via: "Meridian Group -> CLIENT_IN -> M-012" }],
    baselineFinds: 1,
  },
  {
    id: "e3",
    title: "Northgate under its new name",
    text: "We are asked to represent Calder HOA against Northgate Partners over balcony defects.",
    expectPaths: [{ kind: "direct_adversity", via: "Northgate Partners -> ADVERSE_IN -> M-008 (we acted for Hartwell)" }],
    baselineFinds: 1,
  },
  {
    id: "e4",
    title: "Northgate under its old name",
    text: "Calder HOA also asks about a claim against Northgate & Co from the same development.",
    expectPaths: [{ kind: "corporate_family", via: "Northgate & Co -> ALIAS_OF -> Northgate Partners -> ADVERSE_IN -> M-008" }],
    baselineFinds: 0,
  },
  {
    id: "e5",
    title: "Vasquez spouse adverse",
    text: "Ridgeline Capital wants to sue Elena Vasquez over a personal guarantee.",
    expectPaths: [{ kind: "related_person", via: "Elena Vasquez -> RELATED_TO(family) -> Marco Vasquez -> CLIENT_IN -> M-019" }],
    baselineFinds: 0,
  },
  {
    id: "e6",
    title: "Kane under officer's name",
    text: "A new client asks us to pursue Robert T. Kane personally over unpaid invoices.",
    expectPaths: [
      { kind: "related_person", via: "Robert T. Kane -> RELATED_TO(officer) -> Kane Logistics LLC -> DECLINED_CONSULT -> M-031" },
      { kind: "declined_consult", via: "officer link to declined consult" },
    ],
    baselineFinds: 1,
  },
  {
    id: "e7",
    title: "Direct repeat client check",
    text: "Marco Vasquez returns: he wants to sue his co-investor Dmitri Aronov over the buy-in.",
    expectPaths: [{ kind: "direct_adversity", via: "Marco Vasquez is a current client (M-019) — same-side check" }],
    baselineFinds: 1,
  },
  {
    id: "e8",
    title: "Hartwell conflict from the other side",
    text: "Northgate Partners asks us to defend it against Hartwell Property Trust.",
    expectPaths: [
      { kind: "direct_adversity", via: "Northgate Partners -> ADVERSE_IN -> M-008" },
      { kind: "direct_adversity", via: "Hartwell Property Trust -> CLIENT_IN -> M-008" },
      { kind: "corporate_family", via: "alias Northgate & Co history" },
    ],
    baselineFinds: 0,
  },
];

export const PLANTED_MANIFEST = {
  totalExpectedPaths: EVAL_INTAKES.reduce((a, i) => a + i.expectPaths.length, 0), // 12
  baselineTotal: EVAL_INTAKES.reduce((a, i) => a + i.baselineFinds, 0), // 4
};

// ------------------------------------------------- procedural filler -------
// Deterministic PRNG (mulberry32) so two builds are byte-identical.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Alan", "Bea", "Carl", "Dina", "Emil", "Farah", "Gus", "Hana", "Ivo", "June", "Kofi", "Lena", "Milo", "Nora", "Omar", "Pia"];
const LAST = ["Abbott", "Brandt", "Castillo", "Deng", "Ellison", "Fontaine", "Grieg", "Holt", "Ibarra", "Jansen", "Keller", "Lindqvist", "Moreau", "Novak", "Okafor", "Price"];
const ORG_A = ["Blue Harbor", "Cedarline", "Dockside", "Eastbrook", "Fairweather", "Granite Row", "Hollis", "Ironvale", "Juniper", "Kestrel"];
const ORG_B = ["Foods", "Marine", "Interiors", "Analytics", "Freight", "Clinics", "Press", "Energy", "Outfitters", "Realty"];
const WORK = ["supply agreement", "employment dispute", "lease negotiation", "IP assignment", "shareholder dispute", "debt recovery", "zoning appeal", "asset purchase"];

export function buildFiller(): { nodes: NodeSpec[]; edges: EdgeSpec[] } {
  const rnd = mulberry32(20261015);
  const nodes: NodeSpec[] = [];
  const edges: EdgeSpec[] = [];
  const attorneys = ATTORNEYS.map((a) => a.key);
  for (let i = 0; i < 36; i++) {
    const mKey = `mf${String(i).padStart(2, "0")}`;
    const year = 2021 + Math.floor(rnd() * 6);
    const clientIsOrg = rnd() < 0.6;
    const cKey = `${mKey}_c`;
    const cName = clientIsOrg
      ? `${ORG_A[Math.floor(rnd() * ORG_A.length)]} ${ORG_B[Math.floor(rnd() * ORG_B.length)]}`
      : `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    const aKey = `${mKey}_a`;
    const aName = `${ORG_A[Math.floor(rnd() * ORG_A.length)]} ${ORG_B[Math.floor(rnd() * ORG_B.length)]}`;
    const work = WORK[Math.floor(rnd() * WORK.length)];
    nodes.push({ label: "Matter", key: mKey, title: `${cName} — ${work}`, year, status: rnd() < 0.3 ? "active" : "closed" });
    nodes.push(clientIsOrg ? { label: "Org", key: cKey, name: cName } : { label: "Person", key: cKey, name: cName });
    nodes.push({ label: "Org", key: aKey, name: aName });
    edges.push({ type: "CLIENT_IN", from: cKey, to: mKey, source: `engagement letter ${mKey.toUpperCase()}`, since: `${year}-03` });
    edges.push({ type: "ADVERSE_IN", from: aKey, to: mKey, source: `pleadings ${mKey.toUpperCase()}`, since: `${year}-04` });
    edges.push({ type: "WORKED_ON", from: attorneys[Math.floor(rnd() * attorneys.length)], to: mKey, source: `timekeeping ${mKey.toUpperCase()}`, since: `${year}-03` });
  }
  return { nodes, edges };
}

export function buildCorpus(): { nodes: NodeSpec[]; edges: EdgeSpec[] } {
  const filler = buildFiller();
  // Planted names must never collide with filler names (keeps ground truth clean).
  const plantedNames = new Set(
    [...ATTORNEYS, ...PLANTED_NODES].map((n) => ("name" in n ? n.name : n.title).toLowerCase()),
  );
  const nodes = [...ATTORNEYS, ...PLANTED_NODES, ...filler.nodes.filter((n) => !plantedNames.has(("name" in n ? n.name : n.title).toLowerCase()))];
  const edges = [...PLANTED_EDGES, ...filler.edges];
  return { nodes, edges };
}
