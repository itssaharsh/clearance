// CLI: npm run seed. Wipes and reloads the demo firm graph. Requires FALKORDB_URL.
import { resetGraph } from "../src/lib/corpus-load";

resetGraph()
  .then(({ nodes, edges }) => {
    console.log(`seeded firm_demo: ${nodes} nodes, ${edges} edges`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(`seed failed: ${e.message}`);
    process.exit(1);
  });
