// Composes store, social and README images from the real captures in assets/screenshots.
// Usage: node scripts/screenshots.mjs && node scripts/promo.mjs
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// about:blank cannot load file:// URLs, so every resource is inlined.
const data = async (path, type) =>
  `data:${type};base64,${(await readFile(path)).toString("base64")}`;
const shot = (name) => data(`assets/screenshots/${name}.png`, "image/png");
const font = await data("public/fonts/geist.woff2", "font/woff2");
const mono = await data("public/fonts/geist-mono.woff2", "font/woff2");
const site = await shot("demo-site");
const symbol = await readFile("brand/symbol.svg", "utf8");
const wordmark = await readFile("brand/wordmark-dark.svg", "utf8");
for (const dir of ["assets/store", "assets/social", "assets/readme"])
  await mkdir(dir, { recursive: true });

const base = `<style>
@font-face{font-family:Geist;src:url(${font})}
@font-face{font-family:GeistMono;src:url(${mono})}
*{box-sizing:border-box;margin:0}
body{background:#06090D;color:#F2F6F8;font-family:Geist,sans-serif;overflow:hidden;-webkit-font-smoothing:antialiased}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 60% 45% at 25% -5%,rgb(52 211 153/.20),transparent 70%),radial-gradient(ellipse 55% 45% at 60% -10%,rgb(34 211 238/.18),transparent 70%),radial-gradient(ellipse 50% 40% at 90% 0%,rgb(59 130 246/.18),transparent 70%)}
.frame{position:relative;display:grid;grid-template-columns:712px 400px;border:1px solid #24313A;border-radius:14px;overflow:hidden;background:#0D1318;box-shadow:0 30px 80px -20px #000}
.bar{grid-column:1/-1;display:flex;gap:8px;align-items:center;padding:12px 16px;border-bottom:1px solid #24313A}
.bar i{width:11px;height:11px;border-radius:50%;background:#24313A}
.bar span{margin-left:10px;flex:1;background:#06090D;border-radius:6px;padding:4px 12px;font:12px GeistMono;color:#93A1AC}
.frame img{display:block;width:100%;height:760px}
.frame img+img{border-left:1px solid #24313A}
.eyebrow{font:500 15px GeistMono;letter-spacing:.18em;text-transform:uppercase;color:#67E8F9}
h1{font-weight:600;letter-spacing:-.025em}
p{color:#93A1AC}
</style>`;
const panels = {};
for (const name of ["tools", "playground", "agent", "activity", "audit"])
  panels[name] = await shot(`${name}-dark`);
const frame = (panel) =>
  `<div class="frame"><div class="bar"><i></i><i></i><i></i><span>127.0.0.1:4178 · Toolpeek demo</span></div><img src="${site}"><img src="${panels[panel]}"></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(path, width, height, body) {
  await page.setViewportSize({ width, height });
  await page.setContent(`${base}<body>${body}</body>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path, type: "png" });
}

// Chrome Web Store screenshots: 1280x800, one feature each.
const store = [
  ["tools", "Discover every WebMCP tool on a page", "Search, filter by safety hint and read each tool's parameters."],
  ["playground", "Run tools with validated input", "Generated forms or raw JSON. State-changing tools ask first."],
  ["agent", "Let Gemini, ChatGPT or Claude drive", "Bring your own key. Writes wait for your approval."],
  ["activity", "Review every request and response", "Arguments, results, durations and errors, kept locally."],
  ["audit", "Audit tool definitions", "Spec issues and risky metadata, exported as JSON or HTML."],
];
for (const [i, [panel, title, sub]] of store.entries())
  await render(
    `assets/store/screenshot-${i + 1}-${panel}.png`,
    1280,
    800,
    `<div class="glow"></div><div style="position:relative;padding:40px 0 0;text-align:center">
      <h1 style="font-size:34px">${title}</h1><p style="font-size:18px;margin-top:8px">${sub}</p>
      <div style="width:1112px;margin:32px auto 0;zoom:.86">${frame(panel)}</div></div>`,
  );

const card = (panel, zoom) =>
  `<img src="${panels[panel]}" style="display:block;width:400px;zoom:${zoom};border:1px solid #24313A;border-radius:14px;box-shadow:0 30px 80px -20px #000">`;

// Small promo tile 440x280 and marquee 1400x560: little text, readable at half size.
await render(
  "assets/store/small-promo-440x280.png",
  440,
  280,
  `<div class="glow"></div><div style="position:relative;height:100%;display:grid;place-content:center;justify-items:center;gap:18px">
    <div style="width:84px">${symbol}</div><h1 style="font-size:30px">See what AI agents see.</h1></div>`,
);
await render(
  "assets/store/marquee-1400x560.png",
  1400,
  560,
  `<div class="glow"></div><div style="position:relative;display:flex;align-items:center;height:100%;padding-left:90px;gap:60px">
    <div style="flex:0 0 520px"><div style="width:240px">${wordmark}</div>
    <h1 style="font-size:48px;line-height:1.1;margin-top:28px;white-space:nowrap">See what AI agents see.</h1>
    <p class="eyebrow" style="margin-top:20px">Discover. Inspect. Execute.</p></div>
    <div style="align-self:flex-start;margin-top:56px;display:flex;gap:28px">${card("tools", 0.9)}${card("playground", 0.9)}</div></div>`,
);

// Social preview 1200x630 (Open Graph, X, LinkedIn, GitHub).
await render(
  "assets/social/og.png",
  1200,
  630,
  `<div class="glow"></div><div style="position:relative;display:flex;height:100%;padding:70px 0 0 72px;gap:48px">
    <div style="flex:0 0 470px"><div style="width:220px">${wordmark}</div>
    <h1 style="font-size:60px;line-height:1.05;margin-top:56px">See what AI agents see.</h1>
    <p style="font-size:22px;margin-top:22px;line-height:1.45">Discover, inspect and run the WebMCP tools a website exposes. Open-source Chrome extension.</p></div>
    <div style="display:flex;gap:24px;margin-left:auto;margin-right:-60px">${card("tools", 0.82)}${card("playground", 0.82)}</div></div>`,
);

// README showcase.
await render(
  "assets/readme/showcase.png",
  1240,
  900,
  `<div class="glow"></div><div style="position:relative;padding:44px 64px">${frame("tools")}</div>`,
);
await browser.close();
console.log("Promotional images written to assets/");
