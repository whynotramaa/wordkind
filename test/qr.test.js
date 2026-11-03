import { test, expect } from "bun:test";
import { shareTarget, shareQrSvg } from "../lib/qr.js";
import { handleRequest } from "../lib/api.js";
test("share links stay on the game origin and SVG contains a real colorful code", async () => {
  const url = "https://wordkind.example/?room=abcdef123456";
  expect(shareTarget(url, "https://wordkind.example")).toBe(url);
  for (const bad of [
    "javascript:alert(1)",
    "https://other.example/",
    "https://wordkind.example/admin",
    "https://wordkind.example/?room=bad",
    "https://wordkind.example/?token=private",
  ])
    expect(() => shareTarget(bad, "https://wordkind.example")).toThrow();
  const response = await handleRequest(
    new Request(
      `https://wordkind.example/api/qr?target=${encodeURIComponent(url)}`,
    ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("image/svg+xml");
  const svg = await response.text();
  expect(svg).toContain("#70517f");
  expect(svg).toContain("#405d42");
  expect(svg).toContain("#e6e0f5");
  expect(svg).not.toContain("<script");
  expect(svg).toBe(shareQrSvg(url));
  expect(
    (
      await handleRequest(
        new Request(
          "https://wordkind.example/api/qr?target=https://evil.example",
        ),
      )
    ).status,
  ).toBe(400);
});

test("styled QR codes decode to exact links at phone and export sizes", async () => {
  const { default: sharp } = await import("sharp"),
    { default: jsQR } = await import("jsqr");
  for (const target of [
    "https://wordkind.example/",
    "https://wordkind.example/?room=abcdef123456",
    "https://wordkind-preview-feature-branch-a1b2c3d4e5-our-team.vercel.app/?room=abcdef123456",
  ]) {
    for (const size of [188, 215, 400]) {
      const { data, info } = await sharp(Buffer.from(shareQrSvg(target)))
        .resize(size, size)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      expect(result?.data).toBe(target);
    }
  }
});
