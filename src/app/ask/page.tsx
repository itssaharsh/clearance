"use client";

import { useState } from "react";
import type { AskResult } from "@/lib/schemas";

const TEMPLATES: Array<{ id: string; label: string; paramLabel: string | null; defaultParam: string }> = [
  { id: "touched_family", label: "Who has ever touched a … entity?", paramLabel: "Organisation", defaultParam: "Meridian Group" },
  { id: "attorney_history", label: "Which attorney has history with …?", paramLabel: "Person or org", defaultParam: "Northgate Partners" },
  { id: "declined", label: "Whom have we declined, and where is that recorded?", paramLabel: null, defaultParam: "" },
  { id: "wall_screen", label: "Who would a wall around … need to screen?", paramLabel: "Matter", defaultParam: "Meridian Group — lease portfolio restructuring" },
];

const KIND_TONE: Record<string, string> = {
  Matter: "border-indigo-300 bg-indigo-50",
  Attorney: "border-emerald-300 bg-emerald-50",
};

export default function AskPage() {
  const [tid, setTid] = useState(TEMPLATES[0].id);
  const [param, setParam] = useState(TEMPLATES[0].defaultParam);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);

  const tpl = TEMPLATES.find((t) => t.id === tid)!;

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ask?tid=${encodeURIComponent(tid)}&param=${encodeURIComponent(param)}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "query failed");
        return;
      }
      setResult(body);
    } catch {
      setError("Request failed — retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Ask the firm</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Institutional memory as queries: every answer is a subgraph, and every claim cites the matter it comes from. No free-form chat — the same question returns the same answer, twice.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTid(t.id);
              setParam(t.defaultParam);
              setResult(null);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${t.id === tid ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {tpl.paramLabel && (
          <input
            value={param}
            onChange={(e) => setParam(e.target.value)}
            placeholder={tpl.paramLabel}
            className="w-80 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        )}
        <button type="button" onClick={ask} disabled={busy} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-400">
          {busy ? "Traversing…" : "Ask"}
        </button>
      </div>

      {error && <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</p>}

      {result && (
        <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-800">{result.question}</h2>
          {result.empty ? (
            <p className="mt-2 text-sm text-zinc-600">
              The firm has no recorded history here. A negative answer is an actual traversal over every record, not a guess.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.nodes.map((n) => (
                  <span key={n.id} className={`rounded-md border px-2 py-0.5 text-xs font-medium ${KIND_TONE[n.kind] ?? "border-zinc-300 bg-zinc-50"}`}>
                    {n.label}
                    <span className="ml-1 text-[9px] uppercase text-zinc-400">{n.kind}</span>
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-2">
                {result.edges.map((e, i) => (
                  <li key={i} className="text-xs text-zinc-600">
                    <span className="font-medium text-zinc-800">{e.from}</span> —{e.rel.toLowerCase().replace(/_/g, " ")}→{" "}
                    <span className="font-medium text-zinc-800">{e.to}</span>
                    {e.source && <span className="text-zinc-400"> · source: {e.source}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-zinc-500">Cited matters: {result.citations.join("; ")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
