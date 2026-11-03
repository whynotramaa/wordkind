import { startApp } from "./helpers/app-server.mjs";
const server = await startApp(),
  base = server.base;
import { chromium } from "playwright";
import assert from "node:assert/strict";
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const failures = [];
  async function create() {
    const ctx = await b.newContext({ viewport: { width: 390, height: 1000 } }),
      page = await ctx.newPage();
    page.on("pageerror", (e) => failures.push(e.message));
    await page.goto(base);
    await page.locator(".letter").first().waitFor();
    return { ctx, page };
  }
  const a = await create();
  await a.page.locator("#menu-button").click();
  await a.page.locator("#library-button").click();
  await a.page.locator("#library-jump").fill("241");
  await a.page.locator("#library-go").click();
  const points = await a.page.locator(".letter").evaluateAll((els) =>
    [..."PASTEL"].map((letter) => {
      const e = els.find((e) => e.textContent === letter),
        r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  await a.page.mouse.move(points[0].x, points[0].y);
  await a.page.mouse.down();
  for (const p of points.slice(1))
    await a.page.mouse.move(p.x, p.y, { steps: 8 });
  await a.page.mouse.up();
  await a.page.waitForFunction(() =>
    document.querySelector("#progress-label").textContent.startsWith("1 /"),
  );
  // A delayed bonus validation must not mutate a replacement puzzle/run.
  let checked = false;
  const catalog = await fetch(base + "/api/puzzles").then((r) => r.json());
  const extra = [
    "PETAL",
    "PLATE",
    "PLEAT",
    "LEAP",
    "PALE",
    "LATE",
    "TALE",
    "PAST",
    "SALT",
    "SEAT",
    "EAST",
    "LAST",
  ].find((w) => !catalog[240].slots.some((s) => s.word === w));
  await a.page.route("**/api/word", async (route) => {
    checked = true;
    await new Promise((r) => setTimeout(r, 700));
    await route.continue();
  });
  await a.page.locator("#word-input").fill(extra);
  await a.page.locator("#word-input").press("Enter");
  await a.page.locator("#new-puzzle").click();
  await a.page.waitForTimeout(1000);
  assert.equal(checked, true);
  assert.equal(await a.page.locator("#wallet-count").innerText(), "0");
  await a.page.unroute("**/api/word");
  await a.page.locator("#menu-button").click();
  await a.page.locator("#race-nav").click();
  await a.page.locator("#player-name").fill("Chai champion");
  await a.page.locator("#room-difficulty").selectOption("breezy");
  await a.page.locator("#create-room").click();
  await a.page.locator("#invite-link").waitFor();
  const link = await a.page.locator("#invite-link").inputValue();
  const c = await create();
  await c.page.goto(link);
  await c.page.locator("#player-name").fill("Sharma ji");
  await c.page.locator("#create-room").click();
  await c.page.locator("#ready-button").waitFor();
  await c.page.goto("about:blank");
  await a.page.waitForFunction(() =>
    document.querySelector(".ready-players")?.textContent.includes("Offline"),
  );
  assert.match(
    await a.page.locator("#dialog-content").innerText(),
    /reopen this link/,
  );
  await c.page.goto(link);
  await c.page.locator("#create-room").click();
  await c.page.locator("#ready-button").waitFor();
  await a.page.locator("#ready-button").click();
  await c.page.locator("#ready-button").click();
  await a.page.locator("#countdown").waitFor({ state: "visible" });
  await a.page.locator("#countdown").waitFor({ state: "hidden" });
  await c.page.goto("about:blank");
  await a.page.locator("#next-round").waitFor({ timeout: 25000 });
  assert.match(
    await a.page.locator("#dialog-content").innerText(),
    /You win by forfeit/,
  );
  await c.page.goto(link);
  await c.page.locator("#create-room").click();
  await c.page.locator("#next-round").waitFor();
  assert.match(
    await c.page.locator("#dialog-content").innerText(),
    /Your friend wins by forfeit/,
  );
  assert.doesNotMatch(
    await c.page.locator("#dialog-content").innerText(),
    /This match is yours/,
  );
  assert.deepEqual(failures, []);
  console.log(
    "Edge checks passed: real pointer drag; stale bonus response; waiting-room offline state; live disconnect grace/forfeit; loser reconnect gets correct result.",
  );
} finally {
  await b.close();
  server.stop();
}
