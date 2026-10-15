import type { BaselineResult, ConflictPath, ResolvedParty } from "@/lib/schemas";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "blocked"
      ? "bg-red-100 text-red-800 border-red-300"
      : status === "cleared"
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : status === "walled"
          ? "bg-amber-100 text-amber-800 border-amber-300"
          : "bg-zinc-100 text-zinc-700 border-zinc-300";
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>{status}</span>;
}

const REL_LABEL: Record<string, string> = {
  ALIAS_OF: "same entity as",
  SUBSIDIARY_OF: "subsidiary of",
  RELATED_TO: "related to",
  CLIENT_IN: "our client in",
  ADVERSE_IN: "adverse party in",
  WITNESS_IN: "witness in",
  DECLINED_CONSULT: "declined consult",
};

export function PathCard({ path }: { path: ConflictPath }) {
  const kindLabel = path.kind.replace(/_/g, " ");
  return (
    <div className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${path.severity === "conflict" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
          {path.severity}
        </span>
        <span className="text-sm font-medium text-zinc-700">{kindLabel}</span>
        {path.waivable && <span className="text-xs text-zinc-500">waivable with consent</span>}
      </div>
      <div className="flex flex-wrap items-center gap-y-2">
        {path.hops.map((h, i) => (
          <span key={i} className="flex flex-wrap items-center">
            {i === 0 && <NodePill name={h.from} kind={h.fromKind} />}
            <span className="mx-2 flex flex-col items-center text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-red-700">{REL_LABEL[h.rel] ?? h.rel}</span>
              <svg width="72" height="10" aria-hidden className="text-red-400">
                <line x1="0" y1="5" x2="62" y2="5" stroke="currentColor" strokeWidth="2" />
                <path d="M62 1 L70 5 L62 9 Z" fill="currentColor" />
              </svg>
            </span>
            <NodePill name={h.to} kind={h.toKind} />
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-2">
        {path.hops.map((h, i) => (
          <li key={i} className="text-xs text-zinc-600">
            {h.explanation} <span className="text-zinc-400">— source: {h.source} ({h.since})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NodePill({ name, kind }: { name: string; kind: string }) {
  const tone = kind === "Matter" ? "border-indigo-300 bg-indigo-50 text-indigo-900" : kind === "Attorney" ? "border-emerald-300 bg-emerald-50" : "border-zinc-300 bg-zinc-50";
  return (
    <span className={`rounded-md border px-2 py-1 text-sm font-medium text-zinc-900 ${tone}`}>
      {name}
      <span className="ml-1 text-[10px] uppercase text-zinc-400">{kind}</span>
    </span>
  );
}

export function BaselinePanel({ baseline }: { baseline: BaselineResult[] }) {
  const total = baseline.reduce((a, b) => a + b.hits, 0);
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold text-zinc-700">The incumbent: literal name search</h3>
      <p className="mt-1 text-xs text-zinc-500">What a spreadsheet or a practice-management name search sees for the same intake. This is the product with FalkorDB taken out.</p>
      <ul className="mt-3 space-y-1">
        {baseline.map((b) => (
          <li key={b.query} className="flex items-baseline justify-between text-sm">
            <span className="text-zinc-700">“{b.query}”</span>
            <span className={b.hits === 0 ? "font-semibold text-zinc-400" : "font-semibold text-zinc-800"}>
              {b.hits === 0 ? "no hits" : `${b.hits} hit${b.hits > 1 ? "s" : ""}: ${b.hitNames.join(", ")}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-zinc-800">String search total: {total}.</p>
    </div>
  );
}

export function PartyChips({ parties }: { parties: ResolvedParty[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {parties.map((p) => (
        <span
          key={p.party.name}
          className={`rounded-md border px-2 py-1 text-xs ${
            p.status === "matched" ? "border-emerald-300 bg-emerald-50" : p.status === "uncertain" ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-white"
          }`}
        >
          <span className="font-medium">{p.party.name}</span>
          <span className="ml-1 text-zinc-500">{p.party.role.replace("_", " ")}</span>
          <span className="ml-1 uppercase text-[10px] text-zinc-500">
            {p.status === "matched" ? `= ${p.canonicalName} (${Math.round(p.confidence * 100)}%)` : p.status === "uncertain" ? `uncertain: ${p.canonicalName}?` : "new"}
          </span>
        </span>
      ))}
    </div>
  );
}
