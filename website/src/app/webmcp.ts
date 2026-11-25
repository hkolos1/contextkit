import { signal } from "@angular/core";
import type { Router } from "@angular/router";
import { features, site } from "./site";

/**
 * WebMCP tools this website registers about itself, so visitors can try
 * Toolpeek on toolpeek.web.app. All are read-only and return public
 * information; nothing leaves the browser.
 */
type Json = Record<string, unknown>;
interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: Json;
      annotations?: Json;
      execute: (args: Json) => Promise<string>;
    },
    options?: { signal?: AbortSignal },
  ): Promise<unknown> | unknown;
}

/** Names of the tools registered on this page; empty when WebMCP is unavailable. */
export const webmcp = signal<string[]>([]);

const readOnly = { readOnlyHint: true };
const object = (properties: Json = {}, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const install: Record<string, string[]> = {
  github: [
    `Download toolpeek-v${site.version}.zip from ${site.releases}.`,
    "Extract it to a folder you keep.",
    "Open chrome://extensions and turn on Developer mode.",
    "Click Load unpacked and select the extracted folder.",
  ],
  source: [
    `git clone ${site.repo}`,
    "cd toolpeek && npm ci && npm run build",
    "Load the dist/ folder with Load unpacked at chrome://extensions.",
  ],
  chrome_web_store: site.chromeWebStore
    ? [`Open ${site.chromeWebStore} and click Add to Chrome.`]
    : ["Not available yet. The listing is being prepared; use the github method."],
};

const sections = ["features", "install", "privacy"] as const;

export async function registerSiteTools(router: Router) {
  const api = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (typeof api?.registerTool !== "function") return;

  const tools = [
    {
      name: "get_product_info",
      description:
        "Return Toolpeek's name, version, description, license, browser requirements and official links.",
      inputSchema: object(),
      annotations: readOnly,
      execute: () => ({
        name: site.name,
        tagline: site.tagline,
        description: site.description,
        version: site.version,
        license: "MIT",
        requirements:
          "Desktop Chrome 116+. Live discovery needs a page that registers WebMCP tools and a Chrome build with WebMCP.",
        website: site.url,
        repository: site.repo,
        releases: site.releases,
        chromeWebStore: site.chromeWebStore || null,
      }),
    },
    {
      name: "list_features",
      description:
        "List the extension's features, optionally filtered by a word in the title or description.",
      inputSchema: object({
        query: {
          type: "string",
          description: "Optional case-insensitive word to filter features by.",
        },
      }),
      annotations: readOnly,
      execute: ({ query }: Json) => {
        const q = typeof query === "string" ? query.toLowerCase() : "";
        return features
          .filter((f) => `${f.title} ${f.text}`.toLowerCase().includes(q))
          .map(({ title, text }) => ({ title, description: text }));
      },
    },
    {
      name: "get_install_steps",
      description:
        "Return step-by-step instructions for installing Toolpeek with the chosen method.",
      inputSchema: object(
        {
          method: {
            type: "string",
            enum: Object.keys(install),
            description: "How to install: github (release ZIP), source or chrome_web_store.",
          },
        },
        ["method"],
      ),
      annotations: readOnly,
      execute: ({ method }: Json) => {
        const steps = install[String(method)];
        if (!steps) throw Error(`Unknown method. Use one of: ${Object.keys(install).join(", ")}.`);
        return { method, steps };
      },
    },
    {
      name: "get_privacy_summary",
      description:
        "Summarize what the Toolpeek extension accesses, stores and sends, with a link to the full policy.",
      inputSchema: object(),
      annotations: readOnly,
      execute: () => ({
        accounts: "None. No backend, analytics or telemetry.",
        pageAccess:
          "Only the tab where you click the toolbar icon (activeTab). Reads WebMCP tool definitions and the page origin.",
        storage:
          "Activity in session storage by default; preferences and API keys in local extension storage, not synced.",
        network:
          "Only to the AI provider you configure in the Agent tab, with your own key. None without a key.",
        policy: `${site.url}/privacy`,
      }),
    },
    {
      name: "open_section",
      description:
        "Scroll this website to a section or open the privacy policy. Changes no data.",
      inputSchema: object(
        {
          section: {
            type: "string",
            enum: [...sections],
            description: "Section to show: features, install or privacy.",
          },
        },
        ["section"],
      ),
      annotations: readOnly,
      execute: async ({ section }: Json) => {
        if (!sections.includes(section as (typeof sections)[number]))
          throw Error("Unknown section. Use features, install or privacy.");
        if (section === "privacy") await router.navigate(["/privacy"]);
        else await router.navigate(["/"], { fragment: String(section) });
        return { shown: section, url: location.href };
      },
    },
  ];

  const registered: string[] = [];
  for (const { execute, ...tool } of tools) {
    try {
      await api.registerTool({
        ...tool,
        execute: async (args: Json) => JSON.stringify(await execute(args ?? {})),
      });
      registered.push(tool.name);
    } catch {
      // A rejected registration leaves the rest of the page unaffected.
    }
  }
  webmcp.set(registered);
}
