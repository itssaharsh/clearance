import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clearance",
  description:
    "Name search finds 'Kane Logistics'. Clearance finds the subsidiary suing your client two hops away — and won't open the matter until a lawyer signs the path it drew.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-100 text-zinc-900 antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Clearance
              <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-widest text-zinc-400">conflicts gate</span>
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-zinc-600">
              <Link className="hover:text-zinc-900" href="/">Queue</Link>
              <Link className="hover:text-zinc-900" href="/intake">New intake</Link>
              <Link className="hover:text-zinc-900" href="/ask">Ask the firm</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-zinc-400">
          Demo firm is synthetic (Graph Hacks Rule 6). FalkorDB is the only datastore; every verdict is a replayable Cypher path.
        </footer>
      </body>
    </html>
  );
}
