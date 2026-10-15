import type { Metadata } from "next";
import Link from "next/link";
import { Gloock, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const display = Gloock({ weight: "400", subsets: ["latin"], variable: "--ff-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--ff-body" });
const mono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--ff-mono" });

export const metadata: Metadata = {
  title: "Clearance",
  description:
    "Name search finds 'Kane Logistics'. Clearance finds the subsidiary suing your client two hops away — and won't open the matter until a lawyer signs the path it drew.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <header className="border-b border-line bg-surface-1">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="whitespace-nowrap font-display text-xl tracking-tight">
              Clearance
              <span className="ml-2 hidden align-middle font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:inline">conflicts gate</span>
            </Link>
            <nav className="flex shrink-0 gap-3 text-xs font-medium text-ink-muted sm:gap-4 sm:text-sm">
              <Link className="hover:text-ink" href="/">Queue</Link>
              <Link className="hover:text-ink" href="/intake">New intake</Link>
              <Link className="hover:text-ink" href="/ask">Ask the firm</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-ink-muted">
          The demo firm is synthetic (Graph Hacks Rule 6). FalkorDB is the only datastore; every verdict is a replayable Cypher path.
        </footer>
      </body>
    </html>
  );
}
