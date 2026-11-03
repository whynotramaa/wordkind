import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startApp } from "./helpers/app-server.mjs";
import { catalogUrl } from "../lib/puzzle-catalog.js";
const server = await startApp();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let releaseSession;
const sessionGate = new Promise((resolve) => { releaseSession = resolve; });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let sessionFinished = false;
  await page.route("**/api/session", async (route) => {
    await sessionGate;
    await route.continue();
    sessionFinished = true;
  });
  // Startup must use the static catalog, even if the dynamic API is unavailable.
  await page.route("**/api/puzzles", (route) => route.abort());
  const started = performance.now();
  await page.goto(server.base, { waitUntil: "domcontentloaded" });
  await page.locator(".letter").first().waitFor({ timeout: 5000 });
  const readyMs = Math.round(performance.now() - started);
  assert.equal(sessionFinished, false, "puzzle is playable before the session responds");
  assert.equal(await page.locator(".letter").count() > 0, true);
  const downloads = await page.evaluate((url) =>
    performance.getEntriesByName(location.origin + url).map((r) => ({
      transferSize: r.transferSize, encodedBodySize: r.encodedBodySize,
    })), catalogUrl);
  assert.equal(downloads.length, 1, "preload and fetch share one download");
  const response = await fetch(server.base + catalogUrl);
  assert.match(response.headers.get("cache-control"), /max-age=31536000.*immutable/);
  releaseSession();
  await page.locator("#new-puzzle").click();
  await page.locator(".letter").first().waitFor();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ readyMs, catalog: downloads, sessionIndependent: true }));
} finally {
  releaseSession();
  await browser.close();
  server.stop();
}
