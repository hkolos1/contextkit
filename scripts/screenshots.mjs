// Captures real screenshots of the built extension (dist/) inspecting the local demo.
// Usage: npm run build && node scripts/screenshots.mjs
// Only demo data is shown: no API keys, no real sites, no personal data.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = "assets/screenshots";
await mkdir(out, { recursive: true });
const demo = spawn(process.execPath, ["scripts/demo.mjs"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const root = await mkdtemp(join(tmpdir(), "toolpeek-shots-"));
const ext = resolve("dist");
const context = await chromium.launchPersistentContext(join(root, "profile"), {
  channel: "chromium",
  headless: true,
  viewport: { width: 400, height: 760 },
  deviceScaleFactor: 2,
  args: [
    "--enable-unsafe-extension-debugging",
    `--disable-extensions-except=${ext}`,
    `--load-extension=${ext}`,
    "--enable-features=WebMCP",
  ],
});
try {
  const worker =
    context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const panel = context.pages()[0];
  const site = await context.newPage();
  // 1040px wide: the site column next to the 400px panel in the widest website showcase.
  await site.setViewportSize({ width: 1040, height: 760 });
  await site.goto("http://127.0.0.1:4178");
  await site.bringToFront();
  // Grant activeTab the way a toolbar click does.
  const cdp = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await cdp.send("Target.getTargets", {
    filter: [{ type: "tab" }],
  });
  const target = targetInfos.find((t) => t.url === site.url());
  await cdp.send("Extensions.triggerAction", { id, targetId: target.targetId });
  await cdp.detach();
  await panel.goto(`chrome-extension://${id}/panel.html`);
  await panel.getByText("WebMCP available").waitFor();
  const tab = (name) =>
    panel.getByRole("button", { name, exact: true }).click();
  const shot = async (name) => {
    await panel.waitForTimeout(250);
    await panel.screenshot({ path: `${out}/${name}.png` });
  };

  for (const scheme of ["dark", "light"]) {
    await panel.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await tab("Tools");
    const row = panel.locator("details").filter({
      has: panel.locator("summary code", { hasText: "calculate_total" }),
    });
    if (!(await row.getAttribute("open")))
      await row.locator(":scope > summary").click();
    await shot(`tools-${scheme}`);
    await row.locator(":scope > summary").click();

    await tab("Playground");
    await panel
      .getByLabel("Selected tool")
      .selectOption({ label: "get_item_details" });
    await panel.getByLabel("id", { exact: true }).fill("A1");
    await panel.getByRole("button", { name: "Run tool" }).click();
    await panel.locator(".response pre").waitFor();
    await shot(`playground-${scheme}`);

    await tab("Agent");
    await shot(`agent-${scheme}`);
    await tab("Activity");
    await shot(`activity-${scheme}`);
    await tab("Audit");
    await shot(`audit-${scheme}`);
  }

  // The website and the panel side by side, for composites.
  await panel.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await tab("Tools");
  await site.screenshot({ path: `${out}/demo-site.png` });
  await panel.setViewportSize({ width: 380, height: 520 });
  await panel.goto(`chrome-extension://${id}/popup.html`);
  await panel.locator(".preview").first().waitFor();
  await panel.locator("tp-app").screenshot({ path: `${out}/popup-dark.png` });
} finally {
  await context.close();
  await rm(root, { recursive: true, force: true });
  demo.kill();
}
console.log(`Screenshots written to ${out}/`);
