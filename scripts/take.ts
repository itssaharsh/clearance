/**
 * T10 backup take: records the demo flow against the deployed build as a webm
 * (takes/, gitignored). Follows the contract's demo script beats. Usage:
 *   npx tsx scripts/take.ts https://clearance-chi.vercel.app
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "https://clearance-chi.vercel.app";
const HERO =
  "New inquiry: Kane Logistics LLC wants to sue Meridian Build over the Riverside warehouse contract. Primary contact Robert T. Kane.";
const AMBIG = "A new client asks us to pursue R. Kane personally over unpaid invoices.";

const hold = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runCheck(page: import("playwright").Page, beat: string) {
  await page.getByRole("button", { name: "Run the conflicts check" }).click();
  try {
    await page.waitForURL("**/matter/**", { timeout: 45_000 });
    return;
  } catch {
    // one retry: the text is kept by design; cold starts happen
    await hold(1500);
    await page.getByRole("button", { name: "Run the conflicts check" }).click();
  }
  try {
    await page.waitForURL("**/matter/**", { timeout: 45_000 });
  } catch (e) {
    await page.screenshot({ path: `takes/fail-${beat}.png` });
    const err = await page.locator("p.text-danger, [class*=danger]").allInnerTexts().catch(() => []);
    throw new Error(`beat ${beat}: never reached the matter page; on-screen: ${JSON.stringify(err)}`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "takes", size: { width: 1440, height: 900 } },
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

  // Warm-up: wake the functions and the DB connection before recording beats
  await page.request.get(`${BASE}/api/health`);
  await page.request.get(`${BASE}/api/matters`);
  await hold(1000);

  // Beat 0: pre-populate the queue with one earlier matter (alias case), then open on the queue
  await page.goto(`${BASE}/intake`);
  await page.getByRole("button", { name: "Old company name (alias)" }).click();
  await runCheck(page, "0-prepopulate");
  await page.goto(BASE + "/");
  await hold(2500); // the queue: blocked matter, path count, the promise kept

  // Beat 1: the hero intake
  await page.goto(`${BASE}/intake`);
  await hold(1200);
  await page.getByRole("button", { name: "Warehouse suit (the hero case)" }).click();
  await hold(800);
  await runCheck(page, "1-hero");
  await hold(4000); // paths draw on; baseline panel beside them

  // Beat 2: the wall decision (sign-off written back)
  await page.getByPlaceholder("Attorney name (signs the record)").fill("Mara Quinn");
  await hold(600);
  await page.getByRole("button", { name: "Approve wall" }).click();
  await hold(2500); // seal stamps; signed record line
  await page.goto(BASE + "/");
  await hold(2000); // queue shows WALLED

  // Beat 3: re-run the hero — the standing wall shows on the path
  await page.goto(`${BASE}/intake`);
  await page.getByRole("button", { name: "Warehouse suit (the hero case)" }).click();
  await runCheck(page, "3-wall-recheck");
  await hold(3500); // WALLED badge on the corporate-family path

  // Beat 4: Ask the firm (Track 03)
  await page.goto(`${BASE}/ask`);
  await hold(1000);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await hold(3000); // cited subgraph

  // Beat 5: the staged failure — ambiguous name fails closed, then is resolved and remembered
  await page.goto(`${BASE}/intake`);
  await page.getByRole("button", { name: "Ambiguous name (watch it fail closed)" }).click();
  await runCheck(page, "5-ambiguous");
  await hold(3000); // uncertain banner: the system does not guess
  await page.getByText(`is Robert T. Kane`, { exact: false }).first().click();
  await page.getByPlaceholder("Attorney name (signs the record)").fill("Daniel Osei");
  await hold(600);
  await page.getByRole("button", { name: "Decline the matter" }).click();
  await hold(2500); // declined; alias remembered

  // Beat 6: ask once — the same text again, no question asked this time
  await page.goto(`${BASE}/intake`);
  await page.locator("textarea").fill(AMBIG);
  await runCheck(page, "6-askonce");
  await hold(3500); // resolved via ALIAS_OF; officer path to the declined consult drawn

  await ctx.close();
  await browser.close();
  console.log(errors.length === 0 ? "TAKE OK: no console or page errors" : `TAKE ERRORS:\n${errors.join("\n")}`);
  console.log("video(s) in takes/");
  process.exit(errors.length === 0 ? 0 : 1);
})();
