"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MatterReport, WallProposal } from "@/lib/schemas";

export function DecisionPanel({ report, proposal }: { report: MatterReport; proposal: WallProposal | null }) {
  const router = useRouter();
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aliasChoice, setAliasChoice] = useState<Record<string, string>>({});
  const [screened, setScreened] = useState<string[]>(proposal?.screened.map((s) => s.name) ?? []);

  if (report.status !== "blocked") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Signed and on record: {report.blockedReason}
      </div>
    );
  }

  async function decide(action: "clear" | "decline" | "wall") {
    setBusy(action);
    setError(null);
    try {
      const resolveAliases: Record<string, string> = {};
      for (const u of report.uncertain) {
        const choice = aliasChoice[u.party.name];
        if (choice && choice !== "__new__") resolveAliases[u.party.name] = choice;
      }
      const res = await fetch(`/api/matters/${report.id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          by,
          resolveAliases: Object.keys(resolveAliases).length > 0 ? resolveAliases : undefined,
          screened: action === "wall" ? screened : undefined,
        }),
      });
      const bodyJson = await res.json();
      if (!res.ok) {
        setError(bodyJson.error ?? "decision failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Request failed — nothing was signed. Retry.");
    } finally {
      setBusy(null);
    }
  }

  const needsAliasChoices = report.uncertain.some((u) => !aliasChoice[u.party.name]);

  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Attorney decision</h2>
      <p className="mt-1 text-xs text-zinc-500">The matter stays blocked until someone signs. The signature is written back as the firm's record.</p>

      {report.uncertain.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Resolve uncertain identities first (remembered — never asked again):</p>
          {report.uncertain.map((u) => (
            <div key={u.party.name} className="mt-2 text-sm">
              <span className="font-medium">“{u.party.name}”</span>
              <label className="ml-3 mr-4 inline-flex items-center gap-1">
                <input
                  type="radio"
                  name={`alias-${u.party.name}`}
                  onChange={() => setAliasChoice((c) => ({ ...c, [u.party.name]: u.candidateKey ?? "" }))}
                />
                is {u.canonicalName} ({Math.round(u.confidence * 100)}%)
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name={`alias-${u.party.name}`}
                  onChange={() => setAliasChoice((c) => ({ ...c, [u.party.name]: "__new__" }))}
                />
                a new entity
              </label>
            </div>
          ))}
        </div>
      )}

      {proposal && proposal.screened.length > 0 && (
        <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-semibold text-indigo-900">Proposed ethical wall (from WORKED_ON edges):</p>
          {proposal.screened.map((s) => (
            <label key={s.name} className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={screened.includes(s.name)}
                onChange={(e) => setScreened((cur) => (e.target.checked ? [...cur, s.name] : cur.filter((n) => n !== s.name)))}
              />
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-zinc-500">{s.reason}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={by}
          onChange={(e) => setBy(e.target.value)}
          placeholder="Attorney name (signs the record)"
          className="w-64 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!!busy || by.trim().length < 2 || report.uncertain.length > 0 && needsAliasChoices}
          onClick={() => decide("clear")}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {busy === "clear" ? "Signing…" : "Sign: clear"}
        </button>
        <button
          type="button"
          disabled={!!busy || by.trim().length < 2 || !proposal || screened.length === 0}
          onClick={() => decide("wall")}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {busy === "wall" ? "Raising wall…" : "Approve wall"}
        </button>
        <button
          type="button"
          disabled={!!busy || by.trim().length < 2}
          onClick={() => decide("decline")}
          className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {busy === "decline" ? "Declining…" : "Decline the matter"}
        </button>
      </div>
      {error && <p className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
