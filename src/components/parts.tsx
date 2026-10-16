import type { BaselineResult, ConflictPath, ResolvedParty } from "@/lib/schemas";

export function StatusBadge({ status, stamp = false }: { status: string; stamp?: boolean }) {
  const tone =
    status === "blocked"
      ? "border-conflict text-conflict"
      : status === "cleared"
        ? "border-success text-success"
        : status === "walled"
          ? "border-wall text-wall"
          : "border-line-input text-ink-muted";
  return (
    <span
      className={`inline-block border-2 px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] ${tone} ${stamp ? "stamp-in -rotate-2 rounded-sm" : "rounded-sm"}`}
    >
      {status}
    </span>
  );
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

const KIND_TONE: Record<string, string> = {
  conflict: "text-conflict",
  caution: "text-caution",
};

export function PathCard({ path }: { path: ConflictPath }) {
  const kindLabel = path.kind.replace(/_/g, " ");
  const tone = path.wall ? "text-wall" : (KIND_TONE[path.severity] ?? "text-conflict");
  const border = path.wall ? "border-wall/40" : path.severity === "conflict" ? "border-conflict/40" : "border-caution/40";
  return (
    <div className={`rounded-md border ${border} bg-surface-1 p-4 shadow-[var(--shadow-raised)]`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`border-2 ${path.wall ? "border-wall text-wall" : path.severity === "conflict" ? "border-conflict text-conflict" : "border-caution text-caution"} rounded-sm px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em]`}>
          {path.wall ? "walled" : path.severity}
        </span>
        <span className="text-sm font-medium text-ink">{kindLabel}</span>
        {path.wall ? (
          <span className="text-xs font-medium text-wall">
            ethical wall in place since {path.wall.since} (screened: {path.wall.screened.join(", ") || "none listed"}), approved by {path.wall.by}
          </span>
        ) : (
          path.waivable && <span className="text-xs text-ink-muted">waivable with consent</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-y-2">
        {path.hops.map((h, i) => (
          <span key={i} className="flex flex-wrap items-center">
            {i === 0 && <NodePill name={h.from} kind={h.fromKind} delay={0} />}
            <span className="hop-pill mx-2 flex flex-col items-center text-center" style={{ "--hop-delay": `${i * 360 + 120}ms` } as React.CSSProperties}>
              <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>{REL_LABEL[h.rel] ?? h.rel}</span>
              <svg width="72" height="10" aria-hidden className={tone}>
                <line className="hop-draw" style={{ "--hop-delay": `${i * 360 + 150}ms` } as React.CSSProperties} x1="0" y1="5" x2="62" y2="5" stroke="currentColor" strokeWidth="2" />
                <path d="M62 1 L70 5 L62 9 Z" fill="currentColor" />
              </svg>
            </span>
            <NodePill name={h.to} kind={h.toKind} delay={i * 360 + 300} />
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1 border-t border-line pt-2">
        {path.hops.map((h, i) => (
          <li key={i} className="text-xs text-ink-muted">
            {h.explanation} <span className="font-mono text-[11px] text-ink-muted/70">[source: {h.source}, {h.since}]</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NodePill({ name, kind, delay = 0 }: { name: string; kind: string; delay?: number }) {
  const tone =
    kind === "Matter" ? "border-accent/40 bg-accent-container" : kind === "Attorney" ? "border-success/40 bg-surface-2" : "border-line-input bg-surface-1";
  return (
    <span className={`hop-pill rounded-md border px-2 py-1 text-sm font-medium text-ink ${tone}`} style={{ "--hop-delay": `${delay}ms` } as React.CSSProperties}>
      {name}
      <span className="ml-1 font-mono text-[9px] uppercase tracking-wide text-ink-muted">{kind}</span>
    </span>
  );
}

export function BaselinePanel({ baseline }: { baseline: BaselineResult[] }) {
  const total = baseline.reduce((a, b) => a + b.hits, 0);
  return (
    <div className="rounded-md border border-line bg-surface-sunken p-4">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">Exhibit: literal name search</h3>
      <p className="mt-1 text-xs text-ink-muted">
        What a spreadsheet or a practice-management name search sees for the same intake. This is the product with FalkorDB taken out.
      </p>
      <ul className="mt-3 space-y-1">
        {baseline.map((b) => (
          <li key={b.query} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-ink">“{b.query}”</span>
            <span className={`tnum font-mono text-xs ${b.hits === 0 ? "font-semibold text-ink-muted" : "font-semibold text-ink"}`}>
              {b.hits === 0 ? "no hits" : `${b.hits} hit${b.hits > 1 ? "s" : ""}: ${b.hitNames.join(", ")}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-2 text-sm font-semibold text-ink tnum">String search total: {total}.</p>
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
            p.status === "matched" ? "border-success/50 bg-surface-1" : p.status === "uncertain" ? "border-caution bg-surface-2" : "border-line bg-surface-1"
          }`}
        >
          <span className="font-medium text-ink">{p.party.name}</span>
          <span className="ml-1 text-ink-muted">{p.party.role.replace("_", " ")}</span>
          <span className="ml-1 font-mono text-[10px] uppercase text-ink-muted">
            {p.status === "matched" ? `= ${p.canonicalName} (${Math.round(p.confidence * 100)}%)` : p.status === "uncertain" ? `uncertain: ${p.canonicalName}?` : "new"}
          </span>
        </span>
      ))}
    </div>
  );
}
