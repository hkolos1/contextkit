// Renders raster brand assets (extension icons, favicons) from the SVGs in brand/.
// Usage: node scripts/brand.mjs
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const symbol = await readFile("brand/symbol.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(path, size, inset = 0) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}body{width:${size}px;height:${size}px;display:grid;place-items:center}svg{width:${size - inset * 2}px;height:${size - inset * 2}px}</style>${symbol}`,
  );
  await page.screenshot({ path, omitBackground: true });
}
// Chrome Web Store guidance: 128px icon with 96px artwork and 16px transparent padding.
await png("public/icons/icon-128.png", 128, 16);
for (const size of [16, 32, 48]) await png(`public/icons/icon-${size}.png`, size);
await png("website/public/apple-touch-icon.png", 180);
await png("website/public/icon-512.png", 512);
await browser.close();
