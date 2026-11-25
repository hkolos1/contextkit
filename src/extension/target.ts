import { unwrap, type PageCommand } from "../core/bridge";
export async function active(windowId: number) {
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab?.id === undefined || !tab.url || !/^https?:\/\//.test(tab.url))
    throw Error(
      "Open Toolpeek from its toolbar icon on an HTTP or HTTPS page to grant access.",
    );
  return { id: tab.id, origin: new URL(tab.url).origin };
}
export function page<T>(id: number, doc: string, m: PageCommand) {
  return unwrap<T>(chrome.tabs.sendMessage(id, m, { documentId: doc }));
}
