import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
async function workspace(native: boolean, grant = true) {
  const root = await mkdtemp(join(tmpdir(), "toolpeek-e2e-")),
    ext = resolve(process.env.TOOLPEEK_EXTENSION_DIR ?? "dist");
  const context = await chromium.launchPersistentContext(
    join(root, "profile"),
    {
      channel: "chromium",
      executablePath: process.env.TOOLPEEK_CHROME,
      headless: true,
      viewport: { width: 440, height: 800 },
      args: [
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${ext}`,
        `--load-extension=${ext}`,
        `${native ? "--enable" : "--disable"}-features=WebMCP`,
      ],
    },
  );
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const panel = context.pages()[0],
    site = await context.newPage();
  await site.goto("http://127.0.0.1:4178");
  await site.bringToFront();
  const base = `chrome-extension://${new URL(worker.url()).host}`;
  if (grant) {
    const browser = context.browser();
    if (!browser) throw Error("Browser debug session missing");
    const browserSession = await browser.newBrowserCDPSession();
    const { targetInfos } = await browserSession.send("Target.getTargets", {
      filter: [{ type: "tab" }],
    });
    const targetInfo = targetInfos.find((t) => t.url === site.url());
    if (!targetInfo)
      throw Error(`Demo tab target missing: ${JSON.stringify(targetInfos)}`);
    await browserSession.send("Extensions.triggerAction", {
      id: new URL(worker.url()).host,
      targetId: targetInfo.targetId,
    });
    await browserSession.detach();
  }
  await panel.goto(`${base}/panel.html`);
  return {
    context,
    site,
    panel,
    base,
    close: async () => {
      await context.close();
      await rm(root, { recursive: true, force: true });
    },
  };
}
test("native discovery, validation, execution, confirmation, lifecycle and navigation", async () => {
  const w = await workspace(true);
  try {
    const { panel, site } = w;
    await expect(panel.getByText("WebMCP available")).toBeVisible();
    await expect(
      panel.locator("summary").filter({ hasText: "get_item_details" }),
    ).toBeVisible();
    const row = panel.locator("details").filter({
      has: panel.locator("summary code", { hasText: "get_item_details" }),
    });
    await row.locator(":scope > summary").click();
    await row.getByText("Open in Playground").click();
    await panel.getByLabel("id", { exact: true }).fill("A1");
    await panel.getByRole("button", { name: "Run tool" }).click();
    await expect(panel.locator(".response pre")).toContainText(
      "Field notebook",
    );
    await panel
      .getByLabel("Selected tool")
      .selectOption({ label: "delete_item" });
    await panel.getByLabel("id", { exact: true }).fill("B2");
    await panel.getByText("Run tool", { exact: true }).click();
    await panel
      .getByRole("dialog")
      .getByText("Cancel", { exact: true })
      .click();
    await expect(site.locator("#items")).toContainText("Graph pencil");
    await panel.getByText("Run tool", { exact: true }).click();
    await panel
      .getByRole("dialog")
      .getByText("Confirm and run", { exact: true })
      .click();
    await expect(panel.locator(".response pre")).toContainText("deleted");
    await expect(site.locator("#items")).not.toContainText("Graph pencil");
    await panel
      .getByLabel("Selected tool")
      .selectOption({ label: "execution_error" });
    await panel.getByText("Run tool", { exact: true }).click();
    await panel
      .getByRole("dialog")
      .getByText("Confirm and run", { exact: true })
      .click();
    await expect(panel.locator(".response .tag")).toContainText("Error");
    await panel.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(
      panel.locator("summary").filter({ hasText: "delete_item" }),
    ).toHaveCount(1);
    await panel.getByRole("button", { name: "Tools", exact: true }).click();
    await site.getByRole("button", { name: "Remove error tool" }).click();
    await expect(
      panel.locator("summary").filter({ hasText: "execution_error" }),
    ).toHaveCount(0);
    await site.goto("http://127.0.0.1:4178/empty.html");
    await expect(
      panel.getByText("No registered tools in this inventory."),
    ).toBeVisible();
  } finally {
    await w.close();
  }
});
test("unsupported browser, offline inventory, audit export and preferences", async () => {
  const w = await workspace(false);
  try {
    const { panel } = w;
    await expect(
      panel.getByText("No WebMCP tools on this page"),
    ).toBeVisible();
    await panel.locator("input[type=file]").setInputFiles({
      name: "offline.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify([
          {
            name: "inventory",
            description: "",
            inputSchema: { properties: { token: { type: "bad" } } },
          },
        ]),
      ),
    });
    await expect(panel.locator("summary code")).toHaveText("inventory");
    await panel.getByRole("button", { name: "Audit", exact: true }).click();
    await expect(
      panel
        .locator("article")
        .filter({ hasText: "potentially sensitive" })
        .or(panel.locator("article").filter({ hasText: "sensitive data" })),
    ).toHaveCount(1);
    const download = panel.waitForEvent("download");
    await panel.getByRole("button", { name: "HTML", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("toolpeek-audit.html");
    await panel.getByRole("button", { name: "Settings", exact: true }).click();
    const version = await panel.evaluate(
      () => chrome.runtime.getManifest().version,
    );
    await expect(panel.getByText(`Toolpeek v${version}`)).toBeVisible();
    await panel.locator(".segmented label", { hasText: "Dark" }).click();
    await expect(panel.getByRole("radio", { name: "Dark" })).toBeChecked();
    await expect(panel.locator("html")).toHaveAttribute("data-theme", "dark");
    await panel.getByLabel("Keep activity").check();
    await expect
      .poll(() =>
        panel.evaluate(
          async () => (await chrome.storage.local.get("persistent")).persistent,
        ),
      )
      .toBe(true);
  } finally {
    await w.close();
  }
});
test("release manifest requires a user gesture to grant access", async () => {
  const w = await workspace(false, false);
  try {
    await expect(w.panel.getByText(/toolbar icon on an HTTP/)).toBeVisible();
    await w.panel.goto(`${w.base}/popup.html`);
    await expect(
      w.panel.getByRole("button", { name: "Open Side Panel" }),
    ).toBeEnabled();
  } finally {
    await w.close();
  }
});

test("nested schema editing, raw validation and native side panel action", async () => {
  const w = await workspace(true);
  try {
    const { panel, base } = w;
    await expect(panel.getByText("WebMCP available")).toBeVisible();
    await panel.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await panel.setViewportSize({ width: 400, height: 760 });
    await panel
      .getByRole("button", { name: "Playground", exact: true })
      .click();
    await panel
      .getByLabel("Selected tool")
      .selectOption({ label: "calculate_total" });
    await panel.getByText("Add item", { exact: true }).click();
    await panel.getByLabel("id", { exact: true }).fill("A1");
    await expect(panel.getByText("Run tool", { exact: true })).toBeDisabled();
    await panel.getByLabel("quantity", { exact: true }).fill("3");
    await panel.getByLabel("Include round").click();
    await panel.getByRole("checkbox", { name: "round" }).check();
    await panel.getByLabel("Include currency").click();
    await panel.getByLabel("currency", { exact: true }).selectOption("0");
    await panel.getByText("Run tool", { exact: true }).click();
    await expect(panel.locator(".response pre")).toContainText("24");
    await panel.getByRole("button", { name: "JSON", exact: true }).click();
    await panel.getByLabel("JSON arguments").fill("{");
    await expect(panel.getByText("Run tool", { exact: true })).toBeDisabled();
    await panel.goto(`${base}/popup.html`);
    await expect(panel.locator(".preview")).toHaveCount(3);
    const worker = w.context.serviceWorkers()[0];
    await panel.getByRole("button", { name: "Open Side Panel" }).click();
    await expect
      .poll(() =>
        worker.evaluate(
          async () =>
            (
              await chrome.runtime.getContexts({
                contextTypes: [chrome.runtime.ContextType.SIDE_PANEL],
              })
            ).length,
        ),
      )
      .toBeGreaterThan(0);
  } finally {
    await w.close();
  }
});

test("drops the inventory when switching tabs and rejects stale document execution", async () => {
  const w = await workspace(true);
  try {
    await expect(w.panel.getByText("WebMCP available")).toBeVisible();
    const previous = await w.panel.evaluate(async () => {
      const windowId = (await chrome.windows.getCurrent()).id;
      const response = await chrome.runtime.sendMessage({
        kind: "inspect",
        windowId,
      });
      const { tab, origin, documentId, tools } = response.value;
      return {
        kind: "run",
        windowId,
        target: { tab, origin, documentId },
        tool: tools.find((t: { name: string }) => t.name === "delete_item"),
        args: { id: "A1" },
        confirmed: true,
      };
    });
    const other = await w.context.newPage();
    await other.goto("http://127.0.0.1:4178/empty.html");
    await other.bringToFront();
    await expect(
      w.panel.getByText("Access needed", { exact: true }),
    ).toBeVisible();
    await expect(w.panel.locator("summary")).toHaveCount(0);
    await w.site.bringToFront();
    await w.site.reload();
    await expect(w.panel.getByText("WebMCP available")).toBeVisible();
    const reply = await w.panel.evaluate(
      (msg) => chrome.runtime.sendMessage(msg),
      previous,
    );
    expect(reply.value.kind).toBe("Error");
    await expect(w.site.locator("#items")).toContainText("Field notebook");
  } finally {
    await w.close();
  }
});

test("dropdown menus follow the panel theme and support keyboard selection", async () => {
  const w = await workspace(true);
  try {
    const { panel } = w;
    await expect(panel.getByText("WebMCP available")).toBeVisible();
    const inventory = await panel.evaluate(async () => {
      const { id: windowId } = await chrome.windows.getCurrent();
      const reply = await chrome.runtime.sendMessage({
        kind: "inspect",
        windowId,
      });
      return reply.value.tools;
    });
    await panel.locator("input[type=file]").setInputFiles({
      name: "inventory.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(inventory)),
    });
    await expect(panel.getByText("Offline file")).toBeVisible();
    await panel.bringToFront();
    await panel.setViewportSize({ width: 320, height: 640 });
    const filter = panel.getByLabel("Safety classification");
    for (const theme of ["light", "dark"] as const) {
      await panel.emulateMedia({ colorScheme: theme });
      await filter.click();
      await expect
        .poll(() => filter.evaluate((el) => el.matches(":open")))
        .toBe(true);
      expect(
        await filter.evaluate(
          (el) => getComputedStyle(el, "::picker(select)").backgroundColor,
        ),
      ).toBe(theme === "light" ? "rgb(255, 255, 255)" : "rgb(13, 19, 24)");
      await panel.keyboard.press("Escape");
    }
    await filter.focus();
    await panel.keyboard.press("Space");
    await expect
      .poll(() => filter.evaluate((el) => el.matches(":open")))
      .toBe(true);
    await panel.keyboard.press("End");
    await panel.keyboard.press("Enter");
    await expect(filter).toHaveValue("Unclassified");
    await panel
      .getByRole("button", { name: "Playground", exact: true })
      .click();
    const selected = panel.getByLabel("Selected tool");
    await selected.click();
    await expect(
      selected.getByRole("option", { name: "get_item_details" }),
    ).toBeVisible();
    await selected.getByRole("option", { name: "get_item_details" }).click();
    await expect(panel.getByLabel("id", { exact: true })).toBeVisible();
  } finally {
    await w.close();
  }
});
