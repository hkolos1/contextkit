const repo = "https://github.com/hkolos1/toolpeek";

/** Single place for every outbound link the website uses. */
export const site = {
  name: "Toolpeek",
  version: "1.0.0",
  tagline: "See what AI agents see.",
  description:
    "An open-source browser extension for discovering, inspecting, and interacting with WebMCP tools directly from your browser.",
  url: "https://toolpeek.web.app",
  repo,
  releases: `${repo}/releases/latest`,
  issues: `${repo}/issues/new/choose`,
  license: `${repo}/blob/main/LICENSE`,
  /**
   * Chrome Web Store listing. Empty until the listing is approved; while empty,
   * "Add to Chrome" points to the GitHub installation instructions instead.
   */
  chromeWebStore: "",
};

export const installHref = site.chromeWebStore || "/#install";

export const features = [
  {
    icon: "search",
    title: "Discover tools",
    text: "See every WebMCP tool the active page registers, live. Search by name or description and filter by safety hint.",
  },
  {
    icon: "eye",
    title: "Inspect schemas",
    text: "Read parameters, types, annotations and the full JSON definition. Copy, export or import tool inventories.",
  },
  {
    icon: "terminal",
    title: "Run tools by hand",
    text: "Fill a generated form or raw JSON, validate it against the schema and run it. State-changing tools ask first.",
  },
  {
    icon: "bot",
    title: "Let a model drive",
    text: "Describe a task and Gemini, ChatGPT or Claude calls the page's tools with your own API key. Writes wait for approval.",
  },
  {
    icon: "activity",
    title: "Review every call",
    text: "Arguments, responses, durations and errors for each run and inventory change, exportable as JSON.",
  },
  {
    icon: "shield-check",
    title: "Audit definitions",
    text: "Flag spec issues, missing safety hints and risky metadata. Save the findings as JSON or a standalone HTML report.",
  },
];
