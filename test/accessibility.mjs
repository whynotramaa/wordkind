import { startApp } from "./helpers/app-server.mjs";
const server = await startApp(),
  base = server.base;
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 1000 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.locator(".letter").first().waitFor();
  const reports = [];
  async function audit(name) {
    await p.waitForTimeout(350);
    const results = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    reports.push({
      name,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  }
  assert.equal(await p.locator(".left-rail,.right-rail,.intro").count(), 0);
  const alignment = await p
    .locator("#wheel,#shuffle-button,#hint-button")
    .evaluateAll((els) =>
      ["wheel", "shuffle-button", "hint-button"].map((id) => {
        const e = els.find((e) => e.id === id),
          r = e.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }),
    );
  assert.ok(
    Math.abs(alignment[0].y - alignment[1].y) < 1 &&
      Math.abs(alignment[0].y - alignment[2].y) < 1,
  );
  assert.ok(
    Math.abs(
      alignment[0].x - alignment[1].x - (alignment[2].x - alignment[0].x),
    ) < 1,
  );
  await audit("mobile game");
  await p.locator("#menu-button").click();
  await audit("game drawer");
  await p.locator("#close-settings").click();
  await p.locator("#wallet-nav").click();
  await audit("wallet");
  await p.locator("#close-dialog").click();
  const first = p.locator(".letter").first();
  await first.focus();
  await p.keyboard.press("Enter");
  assert.equal(await first.evaluate((e) => e === document.activeElement), true);
  assert.equal(await first.getAttribute("aria-pressed"), "true");
  await p.keyboard.press("Tab");
  await p.keyboard.press("Enter");
  assert.equal((await p.locator("#word-input").inputValue()).length, 2);
  await p.locator("#clear-word").click();
  await p.locator("#menu-button").click();
  await p.locator("#how-button").click();
  await audit("instructions");
  await p.locator("#close-dialog").click();
  await p.locator("#menu-button").click();
  await p.locator("#library-button").click();
  await audit("library");
  await p.locator("#close-dialog").click();
  await p.locator("#menu-button").click();
  await p.locator("#race-nav").click();
  await audit("invite form");
  await p.locator("#create-room").click();
  await p.locator("#invite-qr").waitFor();
  await p.locator("#invite-qr").evaluate((img) => img.decode());
  await audit("invite QR");

  await p.locator("#close-dialog").click();
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.locator("#menu-button").click();
  await p.locator("#how-button").click();
  await p.locator("#show-demo").click();
  assert.equal(
    await p
      .locator(".tutorial-path")
      .evaluate((e) => getComputedStyle(e).strokeDashoffset),
    "0px",
  );
  await audit("reduced motion tutorial");
  assert.deepEqual(errors, []);
  assert.ok(
    reports.every((r) => r.violations.length === 0),
    JSON.stringify(reports),
  );
  console.log(JSON.stringify(reports, null, 2));
} finally {
  await b.close();
  server.stop();
}
