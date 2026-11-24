import { adapter } from "./adapter";
import { respond, type PageCommand, trustedUI } from "../core/bridge";
const scope = globalThis as typeof globalThis & { contextKitReady?: boolean };
if (!scope.contextKitReady) {
  scope.contextKitReady = true;
  const site = adapter(document);
  let timer: ReturnType<typeof setTimeout>;
  site.api?.addEventListener?.("toolchange", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void chrome.runtime.sendMessage({ kind: "toolchange" }).catch(() => {});
    }, 100);
  });
  chrome.runtime.onMessage.addListener((m: PageCommand, s, reply) => {
    if (
      s.id !== chrome.runtime.id ||
      trustedUI(s, chrome.runtime.getURL("")) ||
      s.url !== chrome.runtime.getURL("background.js")
    )
      return;
    if (m.kind === "discover") return respond(site.discover(), reply);
    if (m.kind === "invoke" && m.origin === location.origin)
      return respond(site.invoke(m.tool, m.args, m.confirmed), reply);
  });
}
