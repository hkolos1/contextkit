const repo = "https://github.com/hkolos1/toolpeek";

/** Single place for every outbound link the website uses. */
export const site = {
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
