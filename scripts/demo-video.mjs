// Records a real Toolpeek session against the demo store: add two products to
// the cart and pay, driven from the Playground with a visible cursor. Frames
// come from CDP screencasts of the store tab and the side panel page, and
// ffmpeg puts them side by side.
// Usage: npm run build && node scripts/demo-video.mjs
// Output: assets/video/demo.mp4 (website) and assets/video/demo.gif (README).
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = "assets/video";
await mkdir(out, { recursive: true });
const work = await mkdtemp(join(tmpdir(), "toolpeek-video-"));
const demo = spawn(process.execPath, ["scripts/demo.mjs"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const ext = resolve("dist");
const context = await chromium.launchPersistentContext(join(work, "profile"), {
  channel: "chromium",
  headless: true,
  viewport: { width: 400, height: 760 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
  args: [
    "--enable-unsafe-extension-debugging",
    `--disable-extensions-except=${ext}`,
    `--load-extension=${ext}`,
    "--enable-features=WebMCP",
  ],
});

/** Collects screencast frames for a page as { t, file } in wall-clock seconds. */
async function record(page, name) {
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = join(work, `${name}-${String(frames.length).padStart(5, "0")}.jpg`);
    frames.push({ t: metadata.timestamp, file });
    await writeFile(file, Buffer.from(data, "base64"));
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
  return { frames, stop: () => cdp.send("Page.stopScreencast") };
}

const pointerSvg = await readFile("brand/mark.svg", "utf8");
/** A visible cursor in the panel, moved with a CSS transition before each action. */
async function installCursor(page) {
  await page.evaluate((svg) => {
    const c = document.createElement("div");
    c.id = "demo-cursor";
    c.innerHTML = svg;
    Object.assign(c.style, {
      position: "fixed", left: "0", top: "0", width: "30px", height: "26px", zIndex: "99999",
      pointerEvents: "none", transform: "translate(320px, 700px)",
      transition: "transform .55s cubic-bezier(.4,.1,.2,1)", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.6))",
    });
    c.querySelector("svg").style.cssText = "width:100%;height:100%";
    document.body.append(c);
  }, pointerSvg);
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function point(page, locator) {
  const box = await locator.boundingBox();
  await page.evaluate(
    ([x, y]) => {
      document.querySelector("#demo-cursor").style.transform = `translate(${x - 15}px, ${y - 13}px)`;
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  await pause(650);
}
async function click(page, locator) {
  await point(page, locator);
  await page.evaluate(() => {
    const c = document.querySelector("#demo-cursor");
    c.animate([{ scale: 1 }, { scale: 0.8 }, { scale: 1 }], { duration: 220 });
  });
  await locator.click();
}
async function type(page, locator, text) {
  await click(page, locator);
  await locator.fill("");
  await locator.pressSequentially(text, { delay: 90 });
}

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const panel = context.pages()[0];
  const site = await context.newPage();
  await site.setViewportSize({ width: 1040, height: 760 });
  await site.goto("http://127.0.0.1:4178");
  await site.bringToFront();
  const cdp = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await cdp.send("Target.getTargets", { filter: [{ type: "tab" }] });
  const target = targetInfos.find((t) => t.url === site.url());
  await cdp.send("Extensions.triggerAction", { id, targetId: target.targetId });
  await cdp.detach();
  await panel.goto(`chrome-extension://${id}/panel.html`);
  await panel.getByText("WebMCP available").waitFor();
  await installCursor(panel);
  await pause(400);

  const tracks = [await record(site, "site"), await record(panel, "panel")];
  const start = Date.now() / 1000;
  await pause(1600);

  // Add two notebooks.
  await click(panel, panel.getByRole("button", { name: "Playground", exact: true }));
  await point(panel, panel.getByLabel("Selected tool"));
  await panel.getByLabel("Selected tool").selectOption({ label: "add_to_cart" });
  await pause(500);
  await type(panel, panel.getByLabel("id", { exact: true }), "A1");
  await type(panel, panel.getByLabel("quantity", { exact: true }), "2");
  await click(panel, panel.getByRole("button", { name: "Run tool" }));
  await pause(500);
  await click(panel, panel.getByRole("dialog").getByText("Confirm and run", { exact: true }));
  await pause(1500);

  // Add a sharpener.
  await type(panel, panel.getByLabel("id", { exact: true }), "C3");
  await type(panel, panel.getByLabel("quantity", { exact: true }), "1");
  await click(panel, panel.getByRole("button", { name: "Run tool" }));
  await pause(400);
  await click(panel, panel.getByRole("dialog").getByText("Confirm and run", { exact: true }));
  await pause(1500);

  // Pay.
  await point(panel, panel.getByLabel("Selected tool"));
  await panel.getByLabel("Selected tool").selectOption({ label: "checkout" });
  await pause(500);
  await click(panel, panel.getByLabel("payment", { exact: true }));
  await panel.getByLabel("payment", { exact: true }).selectOption({ index: 0 });
  await click(panel, panel.getByRole("button", { name: "Run tool" }));
  await pause(500);
  await click(panel, panel.getByRole("dialog").getByText("Confirm and run", { exact: true }));
  await pause(3200);

  // Every call is in the journal.
  await click(panel, panel.getByRole("button", { name: "Activity", exact: true }));
  await pause(2200);
  const end = Date.now() / 1000;
  for (const t of tracks) await t.stop();
  await pause(300);

  // One concat list per page with real frame durations, clipped to the session.
  const lists = [];
  for (const [name, { frames }] of [["site", tracks[0]], ["panel", tracks[1]]]) {
    let lines = "";
    const usable = frames.filter((f, i) => f.t <= end && (frames[i + 1]?.t ?? end) >= start);
    usable.forEach((f, i) => {
      const from = Math.max(f.t, start);
      const to = Math.min(usable[i + 1]?.t ?? end, end);
      lines += `file '${f.file}'\nduration ${Math.max(0.001, to - from).toFixed(3)}\n`;
    });
    lines += `file '${usable.at(-1).file}'\n`;
    const list = join(work, `${name}.txt`);
    await writeFile(list, lines);
    lists.push(list);
  }
  const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  const stack =
    "[0:v]fps=30,scale=1040:760:flags=lanczos,setsar=1[s];[1:v]fps=30,scale=400:760:flags=lanczos,setsar=1[p];" +
    "[s][p]hstack=inputs=2,drawbox=x=1040:y=0:w=1:h=760:color=0x24313A:t=fill[v]";
  ff([
    "-f", "concat", "-safe", "0", "-i", lists[0],
    "-f", "concat", "-safe", "0", "-i", lists[1],
    "-filter_complex", stack, "-map", "[v]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    `${out}/demo.mp4`,
  ]);
  ff([
    "-i", `${out}/demo.mp4`,
    "-vf", "fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
    `${out}/demo.gif`,
  ]);
  ff(["-ss", "9", "-i", `${out}/demo.mp4`, "-frames:v", "1", "-q:v", "3", `${out}/demo-poster.jpg`]);
} finally {
  await context.close();
  demo.kill();
  await rm(work, { recursive: true, force: true });
}
console.log(`Video written to ${out}/`);
