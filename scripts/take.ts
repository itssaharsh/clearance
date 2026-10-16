/**
 * Demo take: records the narrated demo flow as a webm (takes/, gitignored),
 * paced for a voice-over. Prepopulation happens off-camera in a separate
 * context. Each beat logs its timecode so the narration script can match.
 * Usage: npx tsx scripts/take.ts http://localhost:3100
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "https://clearance-chi.vercel.app";
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

  // Off-camera: warm the functions and put one earlier matter in the queue (alias case)
  const prep = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const prepPage = await prep.newPage();
  await prepPage.request.get(`${BASE}/api/health`);
  await prepPage.request.get(`${BASE}/api/matters`);
  await prepPage.goto(`${BASE}/intake`);
  await prepPage.getByRole("button", { name: "Old company name (alias)" }).click();
  await runCheck(prepPage, "prep-alias");
  await prep.close();

  // On camera
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "takes", size: { width: 1440, height: 900 } },
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

  const t0 = Date.now();
  const mark = (name: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${name}`);

  // Beat 1: the queue, one blocked matter already waiting (the hook)
  mark("B1 queue");
  await page.goto(BASE + "/");
  await hold(13_500);

  // Beat 2: the hero intake; extraction is the model's only job
  mark("B2 intake");
  await page.goto(`${BASE}/intake`);
  await hold(2000);
  await page.getByRole("button", { name: "Warehouse suit (the hero case)" }).click();
  await hold(3000);
  await runCheck(page, "2-hero");

  // Beat 3: the drawn paths with provenance
  mark("B3 paths");
  await hold(15_500);

  // Beat 4: the exhibit beside them, the product with FalkorDB taken out
  mark("B4 baseline");
  await hold(12_300);

  // Beat 5: the wall decision, written back as a record
  mark("B5 wall");
  await page.getByPlaceholder("Attorney name (signs the record)").fill("Mara Quinn");
  await hold(1200);
  await page.getByRole("button", { name: "Approve wall" }).click();
  await hold(9_000);

  // Beat 6: re-run the hero; the standing wall shows on the path
  mark("B6 rerun-wall");
  await page.goto(`${BASE}/intake`);
  await page.getByRole("button", { name: "Warehouse suit (the hero case)" }).click();
  await runCheck(page, "6-wall-recheck");
  await hold(8_500);

  // Beat 7: the staged failure; ambiguous name fails closed, is resolved once
  mark("B7 ambiguous");
  await page.goto(`${BASE}/intake`);
  await page.getByRole("button", { name: "Ambiguous name (watch it fail closed)" }).click();
  await hold(1200);
  await runCheck(page, "7-ambiguous");
  await hold(7_500);
  mark("B7b resolve");
  await page.getByText(`is Robert T. Kane`, { exact: false }).first().click();
  await page.getByPlaceholder("Attorney name (signs the record)").fill("Daniel Osei");
  await hold(1200);
  await page.getByRole("button", { name: "Decline the matter" }).click();
  await hold(4_500);

  // Beat 8: ask once; the same text again, no question asked this time
  mark("B8 rerun-remembered");
  await page.goto(`${BASE}/intake`);
  await page.locator("textarea").fill(AMBIG);
  await hold(1000);
  await runCheck(page, "8-askonce");
  await hold(7_800);

  // Beat 9: Ask the firm, cited subgraph answers
  mark("B9 ask");
  await page.goto(`${BASE}/ask`);
  await hold(1000);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await hold(9_200);

  // Beat 10: close on the scorecard
  mark("B10 about");
  await page.goto(`${BASE}/about`);
  await hold(1500);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((e) => e.textContent?.includes("Why a graph"));
    h?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  await hold(10_200);
  mark("END");

  await ctx.close();
  await browser.close();
  console.log(errors.length === 0 ? "TAKE OK: no console or page errors" : `TAKE ERRORS:\n${errors.join("\n")}`);
  console.log("video(s) in takes/");
  process.exit(errors.length === 0 ? 0 : 1);
})();
