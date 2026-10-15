// AC-11 gate: all graph access goes through src/lib/graph.ts (roQuery with
// timeout + bounded-read guard, writeQuery). Direct client use anywhere else fails.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const GRAPH_LAYER = join("src", "lib", "graph.ts");
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|mts)$/.test(name) && p !== GRAPH_LAYER) {
      const text = readFileSync(p, "utf8");
      if (/from\s+["']falkordb["']/.test(text)) offenders.push(`${p}: imports falkordb directly`);
      if (/\.selectGraph\(/.test(text)) offenders.push(`${p}: selectGraph outside the graph layer`);
      if (/\.(query|roQuery)\(\s*["'`]/.test(text)) offenders.push(`${p}: raw client query call`);
    }
  }
}
walk("src");
walk("scripts");

if (offenders.length > 0) {
  console.error("graph-lint FAIL:");
  for (const o of offenders) console.error("  " + o);
  process.exit(1);
}
console.log("graph-lint PASS: all graph access goes through src/lib/graph.ts");
