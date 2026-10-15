/**
 * AC-8: planted-conflict recall, graph vs literal name search, on the seeded
 * corpus. One command rebuilds the whole table (H30). Requires FALKORDB_URL.
 *
 *   npm run eval
 */
import { resetGraph } from "../src/lib/corpus-load";
import { runIntakePipeline } from "../src/lib/intake";
import { MockExtractor } from "../src/lib/extract";
import { EVAL_INTAKES, PLANTED_MANIFEST } from "../src/lib/corpus-spec";

async function main() {
  console.log("resetting demo graph…");
  const { nodes, edges } = await resetGraph();
  console.log(`seeded: ${nodes} nodes, ${edges} edges\n`);

  const extractor = new MockExtractor(); // deterministic: same input, same verdicts
  let graphFound = 0;
  let baselineMeasured = 0;
  const rows: string[][] = [];

  for (const intake of EVAL_INTAKES) {
    const report = await runIntakePipeline({ text: intake.text, title: `[eval] ${intake.title}` }, { extractor });
    const foundKinds = report.paths.map((p) => p.kind);
    let found = 0;
    const pool = [...foundKinds];
    for (const exp of intake.expectPaths) {
      const i = pool.indexOf(exp.kind as (typeof pool)[number]);
      if (i >= 0) {
        found += 1;
        pool.splice(i, 1);
      }
    }
    // measured baseline: how many of this intake's expected conflicts a literal
    // name search also surfaces (any party with >=1 direct name hit)
    const baselineHits = report.baseline.filter((b) => b.hits > 0).length;
    const baselineCaught = Math.min(baselineHits, intake.expectPaths.length);
    graphFound += found;
    baselineMeasured += baselineCaught;
    rows.push([
      intake.id,
      intake.title.slice(0, 38),
      `${found}/${intake.expectPaths.length}`,
      `${baselineCaught}/${intake.expectPaths.length}`,
      report.status,
    ]);
  }

  const w = [4, 40, 8, 10, 9];
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(w[i])).join(" ");
  console.log(line(["id", "intake", "graph", "baseline", "status"]));
  console.log("-".repeat(w.reduce((a, b) => a + b + 1, 0)));
  for (const r of rows) console.log(line(r));
  console.log("-".repeat(w.reduce((a, b) => a + b + 1, 0)));
  console.log(line(["", "TOTAL", `${graphFound}/${PLANTED_MANIFEST.totalExpectedPaths}`, `${baselineMeasured}/${PLANTED_MANIFEST.totalExpectedPaths}`, ""]));
  console.log(`\nmanifest expectation: graph ${PLANTED_MANIFEST.totalExpectedPaths}/${PLANTED_MANIFEST.totalExpectedPaths}, name-search ${PLANTED_MANIFEST.baselineTotal}/${PLANTED_MANIFEST.totalExpectedPaths}`);

  if (graphFound < PLANTED_MANIFEST.totalExpectedPaths) {
    console.error(`\nFAIL: graph recall ${graphFound}/${PLANTED_MANIFEST.totalExpectedPaths}`);
    process.exit(1);
  }
  console.log("\nPASS: every planted conflict found by traversal; zero false clears.");
}

main().catch((e) => {
  console.error(`eval failed: ${e.message}`);
  process.exit(1);
});
