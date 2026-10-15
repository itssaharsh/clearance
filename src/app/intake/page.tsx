"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SAMPLES: Array<{ label: string; text: string }> = [
  {
    label: "Warehouse suit (the hero case)",
    text: "New inquiry: Kane Logistics LLC wants to sue Meridian Build over the Riverside warehouse contract. Primary contact Robert T. Kane.",
  },
  {
    label: "Old company name (alias)",
    text: "Calder HOA asks about a claim against Northgate & Co from the Balcony Row development.",
  },
  {
    label: "Ambiguous name (watch it fail closed)",
    text: "A new client asks us to pursue R. Kane personally over unpaid invoices.",
  },
];

export default function IntakePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error === "invalid intake" ? `Invalid intake: ${(body.issues ?? []).join("; ")}` : (body.error ?? "request failed"));
        return; // the pasted text is kept (retry state)
      }
      router.push(`/matter/${body.id}`);
    } catch {
      setError("Request failed. Your text is kept — retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">New intake</h1>
      <p className="mt-1 text-sm text-zinc-600">Paste the inquiry as it arrived. The model only reads out the parties; the verdict is a graph traversal.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setText(s.text)}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-500"
          >
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={10_000}
        placeholder="e.g. Kane Logistics LLC wants to sue Meridian Build over the Riverside warehouse contract…"
        className="mt-3 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm shadow-sm focus:border-zinc-500 focus:outline-none"
      />

      {error && <p className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy || text.trim().length < 10}
        className="mt-3 rounded-md bg-zinc-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {busy ? "Reading the intake…" : "Run the conflicts check"}
      </button>
      <p className="mt-2 text-xs text-zinc-500">Every check is recorded. Uncertain identities block the matter — the system never guesses.</p>
    </div>
  );
}
