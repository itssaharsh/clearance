import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Clearance",
  description: "What Clearance is, how a conflicts check runs, and why the graph is the product.",
};

const STEPS = [
  {
    n: "1",
    title: "Parties come out of the intake text",
    body: "Paste the inquiry as it arrived. An extractor pulls out the people and companies and their roles. The model's work ends here: it never decides anything.",
  },
  {
    n: "2",
    title: "Names resolve against the firm graph",
    body: "An exact normalized match is the only automatic match. A name that is merely close (initials, an old company name, a contained name) blocks the matter and asks a human, once. The answer is written back as an alias edge, so the same question is never asked again.",
  },
  {
    n: "3",
    title: "FalkorDB draws every path",
    body: "Deterministic openCypher traversals walk up to three hops of typed edges: subsidiaries, aliases, family ties, prior matters, declined consults. Every hop carries its source and date. The matter stays blocked until an attorney signs the drawn paths.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl tracking-tight">The graph is the conflicts check.</h1>
      <p className="mt-3 text-base text-ink-muted">
        Clearance is a conflicts-of-interest gate for small law firms. Before any new matter opens, it draws every
        connection between the new parties and the firm&apos;s history, and keeps the matter blocked until a lawyer
        signs the paths it drew.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-xl">The problem</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Before a firm takes a new client, someone has to answer one question: have we ever been on the other side?
          At most small firms that check is a spreadsheet, ctrl-F and somebody&apos;s memory. A name search finds
          exact strings. It cannot find the subsidiary of a current client, the company that renamed itself, the
          officer of a party the firm declined last year. Those are the conflicts that surface mid-case, and
          missed conflicts are a well-known source of malpractice claims and disqualification motions.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">How a check runs</h2>
        <ol className="mt-3 space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-md border border-line bg-surface-1 p-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">step {s.n}</p>
              <p className="mt-1 font-medium text-ink">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Why a graph, measured</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The demo firm has ten planted conflicts. The graph finds all ten. A literal name search over the same data
          finds six: it misses the subsidiary, the alias, the family tie and the officer, because none of them share
          a string with the intake text. Every matter page shows that name-search baseline next to the drawn paths,
          labelled as what it is: this product with FalkorDB taken out.
        </p>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-md border border-accent/40 bg-accent-container p-4 text-center">
            <p className="tnum font-display text-3xl">10<span className="text-ink-muted">/10</span></p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">graph traversal</p>
          </div>
          <div className="flex-1 rounded-md border border-line bg-surface-sunken p-4 text-center">
            <p className="tnum font-display text-3xl">6<span className="text-ink-muted">/10</span></p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">literal name search</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Reproduce it with one command: <code className="font-mono">npm run eval</code>.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Built to fail closed</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Nothing auto-clears. An uncertain identity blocks the matter. A graph that is down blocks every matter.
          A clear with unresolved uncertainty is refused. Decisions write back into the graph as records: signed
          clearances, ethical walls with their screened attorneys, declined consults. The next check respects all
          of them, which is what makes the gate a record the firm can stand behind rather than a search box.
        </p>
      </section>

      <section className="mt-8 rounded-md border-2 border-ink/20 bg-surface-1 p-5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Judge this in 90 seconds</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink">
          <li>
            Open <Link href="/intake" className="font-medium text-accent underline">New intake</Link>, click
            &ldquo;Warehouse suit (the hero case)&rdquo;, run the check. Two conflict paths draw on, beside the
            name-search exhibit that found less.
          </li>
          <li>Approve the proposed ethical wall, signing as Mara Quinn. The wall is written into the graph.</li>
          <li>Run the same intake again: the path now shows the standing wall instead of a raw conflict.</li>
          <li>
            Try &ldquo;Ambiguous name&rdquo;: the gate refuses to guess who R. Kane is, asks once, and remembers
            the answer as an alias edge.
          </li>
          <li>
            Open <Link href="/ask" className="font-medium text-accent underline">Ask the firm</Link> for cited
            subgraph answers to the questions a managing partner actually asks.
          </li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Limits, stated plainly</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
          <li>The firm is synthetic and seeded, built for the hackathon. No real client data is involved.</li>
          <li>Traversals stop at three hops by design; a longer chain is noise, not signal, for this decision.</li>
          <li>
            Extraction runs in deterministic mock mode by default; an LLM extractor sits behind the same interface.
            Either way, extraction only proposes names. The graph decides.
          </li>
          <li>This is a hackathon build, not legal advice and not a system of record.</li>
        </ul>
        <p className="mt-4 text-sm text-ink-muted">
          Stack: FalkorDB is the only datastore. Next.js on Vercel. Every verdict is a replayable openCypher query;
          the README documents the schema and the exact queries.
        </p>
      </section>
    </div>
  );
}
