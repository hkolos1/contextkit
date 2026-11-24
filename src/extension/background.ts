import {
  isCommand,
  respond,
  trustedUI,
  type Command,
  type PageSnapshot,
} from "../core/bridge";
import { history, log } from "./storage";
import { active, page } from "./target";
import { execute } from "./execution";
import type { Snapshot } from "../core/model";
const inventories = new Map<number, { doc: string; signature: string }>();
chrome.tabs.onRemoved.addListener((id) => inventories.delete(id));
async function inspect(windowId: number): Promise<Snapshot> {
  const tab = await active(windowId);
  const [frame] = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] },
    files: ["content.js"],
    world: "ISOLATED",
  });
  if (!frame?.documentId)
    throw Error("The active document changed. Refresh to reconnect.");
  const snap = await page<PageSnapshot>(tab.id, frame.documentId, {
    kind: "discover",
  });
  if (snap.origin !== tab.origin || (await active(windowId)).id !== tab.id)
    throw Error("The active tab changed.");
  const signature = JSON.stringify(snap.tools);
  const previous = inventories.get(tab.id);
  if (
    snap.available &&
    (previous?.doc !== frame.documentId || signature !== previous?.signature)
  ) {
    inventories.set(tab.id, { doc: frame.documentId, signature });
    const oldest = inventories.keys().next().value;
    if (inventories.size > 12 && oldest !== undefined)
      inventories.delete(oldest);
    await log({
      kind: "Discovery",
      origin: tab.origin,
      name: `${(previous?.doc === frame.documentId ? "Inventory changed · " : "Discovered · ") + snap.tools.length} tools`,
      time: new Date().toISOString(),
      response: snap.tools.map((t) => t.name).slice(0, 150),
    });
  }
  return { ...snap, tab: tab.id, documentId: frame.documentId };
}
async function dispatch(m: Command) {
  switch (m.kind) {
    case "inspect":
      return inspect(m.windowId);
    case "history":
      return history();
    case "clear":
      return history((h) => ({ ...h, entries: [] }));
    case "persist":
      return history((h) => ({ ...h, persistent: m.enabled }));
    case "run":
      return execute(m);
  }
}
chrome.runtime.onMessage.addListener((m, s, reply) => {
  if (
    s.id !== chrome.runtime.id ||
    !trustedUI(s, chrome.runtime.getURL("")) ||
    !isCommand(m)
  )
    return;
  return respond(dispatch(m), reply);
});
