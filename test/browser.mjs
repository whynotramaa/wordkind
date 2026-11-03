import jsQR from "jsqr";
import { PNG } from "pngjs";
function decodeQr(bytes) {
  const png = PNG.sync.read(bytes);
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}
import { startApp } from "./helpers/app-server.mjs";
const server = await startApp(),
  base = server.base;
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const dir = new URL("../.impeccable/review/", import.meta.url).pathname;
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const errors = [];
  const data = await fetch(`${base}/api/puzzles`).then((r) => r.json());
  assert.equal(data.length, 1440);
  async function make(width = 1440, height = 1100) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 650,
      hasTouch: width < 650,
      acceptDownloads: true,
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.goto(base);
    await page.locator(".letter").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    return { ctx, page };
  }
  async function current(page) {
    const title = await page.locator("#level-label").getAttribute("title");
    return data[Number(title.replace(/\D/g, "")) - 1];
  }
  async function enter(page, word) {
    await page.locator("#word-input").fill(word);
    await page.locator("#word-input").press("Enter");
    await page.waitForTimeout(100);
  }
  async function solve(page) {
    const p = await current(page);
    assert.ok(p, "find current puzzle");
    for (const s of p.slots) await enter(page, s.word);
  }
  const { page, ctx } = await make();
  let p = await current(page);
  await enter(page, p.slots[0].word);
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `dir/desktop.png`.replace("dir", dir),
    fullPage: true,
  });
  await page.locator("#menu-button").click();
  await page.locator("[data-difficulty=genius]").click();
  assert.equal(await page.locator("#word-checklist .word-chip").count(), 10);
  assert.equal(await page.locator("#word-checklist").isVisible(), false);
  assert.ok((await page.locator(".letter").count()) >= 7);
  await page.locator("#menu-button").click();
  await page.locator("#expand-board").click();
  assert.ok(await page.locator("#board-expanded").count());
  await page.locator("#back-to-wheel").click();
  await page.locator("#menu-button").click();
  await page.locator("#library-button").click();
  assert.equal(await page.locator(".library-puzzle").count(), 24);
  await page.locator("#library-jump").fill("241");
  await page.locator("#library-go").click();
  assert.equal(await page.locator("#level-label").innerText(), "Puzzle 241");
  p = data[240];
  const word = p.slots[0].word;
  const tiles = await page.locator(".letter").all();
  let used = new Set();
  for (const c of word) {
    const labels = await page.locator(".letter").allTextContents();
    const i = labels.findIndex((l, i) => l === c && !used.has(i));
    used.add(i);
    await page.locator(`.letter[data-index="${i}"]`).click();
  }
  assert.equal(await page.locator("#word-input").inputValue(), word);
  await page.locator("#submit-word").click();
  assert.ok(await page.locator(".cell.solved").count());
  await enter(page, "ZZZ");
  assert.match(await page.locator("#toast").innerText(), /wheel/);
  const bonus = [
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
  ].find((w) => !p.slots.some((s) => s.word === w));
  await enter(page, bonus);
  await page.waitForFunction(
    () => document.querySelector("#wallet-count").textContent === "1",
  );
  await page.locator(".wallet-flight").waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/wallet-flight.png`, fullPage: true });
  await page.waitForTimeout(650);
  await page.locator("#wallet-nav").click();
  await page.locator("#wallet-search").fill(bonus);
  assert.match(
    await page.locator("#wallet-list").innerText(),
    new RegExp(bonus),
  );
  await page.locator("#wallet-sort").selectOption("length");
  await page.locator("#close-dialog").click();
  for (const s of p.slots.slice(1)) await enter(page, s.word);
  await page.locator("#next-solo").waitFor();
  const download = page.waitForEvent("download");
  await page.locator("#download-score").click();
  const file = await download;
  await file.saveAs(`${dir}/scorecard.png`);
  assert.equal(decodeQr(fs.readFileSync(`${dir}/scorecard.png`)), `${base}/`);
  assert.equal(file.suggestedFilename(), "wordkind-scorecard.png");
  await page.screenshot({ path: `${dir}/solo-result.png`, fullPage: true });
  await page.locator("#next-solo").click();
  await page.locator("#menu-button").click();
  await page.locator("[data-mode=daily]").click();
  assert.match(await page.locator("#level-label").innerText(), /Daily/);
  assert.equal(await page.locator("[data-difficulty=hard]").isDisabled(), true);
  await page.locator("#menu-button").click();
  await page.locator("[data-mode=sprint]").click();
  assert.match(await page.locator("#timer-label").innerText(), /left/);
  await page.evaluate(() => {
    const now = Date.now;
    Date.now = () => now() + 181000;
  });
  await page.locator("#retry-solo").waitFor();
  assert.match(await page.locator("#dialog-content").innerText(), /Clock’s up/);
  await page.reload();
  await page.locator(".letter").first().waitFor();
  await page.locator("#menu-button").click();
  await page.locator("#how-button").click();
  await page.locator("#show-demo").click();
  assert.equal(await page.locator(".tutorial-result span").count(), 3);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${dir}/tutorial.png`, fullPage: true });
  await page.locator("#done-demo").click();
  for (const width of [320, 360, 390, 768]) {
    const m = await make(
      width,
      width === 320 ? 667 : width === 360 ? 740 : width === 390 ? 844 : 1024,
    );
    assert.equal(
      await m.page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
    await m.page.locator("#menu-button").click();
    await m.page.locator("[data-difficulty=genius]").click();
    assert.equal(
      await m.page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `genius overflow ${width}`,
    );
    await m.page.locator("#menu-button").click();
    await m.page.locator("[data-difficulty=easy]").click();
    const controls = await m.page
      .locator("#wheel,#shuffle-button,#hint-button")
      .evaluateAll((els) =>
        ["wheel", "shuffle-button", "hint-button"].map((id) => {
          const e = els.find((e) => e.id === id),
            r = e.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }),
      );
    assert.ok(
      Math.abs(controls[0].y - controls[1].y) < 1 &&
        Math.abs(controls[0].y - controls[2].y) < 1,
      `control center line at ${width}`,
    );
    assert.ok(
      Math.abs(
        controls[0].x - controls[1].x - (controls[2].x - controls[0].x),
      ) < 1,
      `symmetric control spacing at ${width}`,
    );
    if (width < 650)
      assert.equal(
        await m.page.evaluate(
          () => document.documentElement.scrollHeight > innerHeight,
        ),
        false,
        `easy game fits ${width}`,
      );
    const q = await current(m.page);
    await enter(m.page, q.slots[0].word);
    await m.page.waitForTimeout(600);
    if (width === 390)
      await m.page.screenshot({ path: `${dir}/mobile.png`, fullPage: true });
    const boxes = await m.page
      .locator(".brand, .wallet-nav, #menu-button")
      .evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    assert.ok(boxes.every((b) => b.x >= 0 && b.x + b.w <= width + 1));
    await m.ctx.close();
  }
  await page.locator("#menu-button").click();
  await page.locator("#race-nav").click();
  await page.locator("#player-name").fill("Chai champion");
  await page.locator("#room-difficulty").selectOption("breezy");
  await page.locator("#room-time").selectOption("60");
  await page.locator("#create-room").click();
  await page.locator("#invite-link").waitFor();
  assert.match(await page.locator(".room-rules").innerText(), /Breezy.*1 min/);
  const link = await page.locator("#invite-link").inputValue();
  await page.locator("#invite-qr").evaluate((img) => img.decode());
  assert.equal(decodeQr(await page.locator("#invite-qr").screenshot()), link);
  const inviteDownload = page.waitForEvent("download");
  await page.locator("#share-invite").click();
  await (await inviteDownload).saveAs(`${dir}/invite-card.png`);
  assert.equal(decodeQr(fs.readFileSync(`${dir}/invite-card.png`)), link);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page
      .locator("#dialog")
      .evaluate((e) => e.scrollWidth > e.clientWidth),
    false,
  );
  await page.screenshot({ path: `${dir}/invite-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });

  await page.screenshot({ path: `${dir}/invite.png`, fullPage: true });
  const friend = await make(390, 1000);
  await friend.page.goto(link);
  await friend.page.locator("#player-name").fill("Sharma ji");
  await friend.page.locator("#create-room").click();
  await friend.page.locator("#ready-button").waitFor();
  await page.locator("#ready-button").click();
  await friend.page.locator("#ready-button").click();
  await page.locator("#countdown").waitFor({ state: "visible" });
  await page.screenshot({ path: `${dir}/countdown.png`, fullPage: true });
  await page.locator("#countdown").waitFor({ state: "hidden" });
  // A slow move acknowledgement must not block or erase the next word.
  let delayedGuess = false;
  await page.route("**/api/rooms/*", async (route) => {
    if (route.request().method() === "POST" && route.request().postDataJSON()?.type === "guess") {
      delayedGuess = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    await route.continue();
  });
  const racePuzzle = await current(page);
  await page.locator("#word-input").fill(racePuzzle.slots[0].word);
  await page.locator("#word-input").press("Enter");
  assert.equal(await page.locator("#word-input").inputValue(), "");
  await page.locator("#word-input").fill("NEXT");
  await page.waitForTimeout(1200);
  assert.equal(delayedGuess, true);
  assert.equal(await page.locator("#word-input").inputValue(), "NEXT");
  await page.unroute("**/api/rooms/*");
  for (let r = 1; r <= 2; r++) {
    await solve(page);
    await page.locator("#next-round").waitFor();
    if (r === 1) {
      await page.locator("#next-round").click();
      await friend.page.locator("#next-round").click();
      await page.locator("#countdown").waitFor({ state: "visible" });
      await page.locator("#countdown").waitFor({ state: "hidden" });
    }
  }
  assert.match(
    await page.locator("#dialog-content").innerText(),
    /Sharma ji’s kid/,
  );
  await page.screenshot({ path: `${dir}/match-score.png`, fullPage: true });
  await friend.page.screenshot({
    path: `${dir}/match-score-mobile.png`,
    fullPage: true,
  });
  const matchDownload = page.waitForEvent("download");
  await page.locator("#download-score").click();
  await (await matchDownload).saveAs(`${dir}/match-card.png`);
  await page.locator("#next-round").click();
  await friend.page.locator("#next-round").click();
  await page.locator("#countdown").waitFor({ state: "visible" });
  assert.equal(await page.locator("#level-label").innerText(), "Round 1 of 3");
  assert.deepEqual(errors, []);
  console.log(
    "Expanded browser checks passed: 1,440 catalog; genius/checklist; expand; library; tap wheel; invalid word; searchable wallet; solo solve; PNG download; daily; sprint expiry; tutorial; 320/360/390/768 layouts; real invite/settings/countdown/two-round win; same-room rematch. No page errors.",
  );
} finally {
  await browser.close();
  server.stop();
}
