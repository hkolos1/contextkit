import type { History } from "../core/bridge";
import type { Entry } from "../core/model";
import { append } from "../core/history";
let queue: Promise<unknown> = Promise.resolve();
export function history(change?: (h: History) => History): Promise<History> {
  const task = queue.then(async () => {
    const { persistent = false } = await chrome.storage.local.get("persistent");
    const store = persistent ? chrome.storage.local : chrome.storage.session;
    const { entries = [] } = await store.get("entries");
    const current: History = {
      persistent: !!persistent,
      entries: entries as Entry[],
    };
    if (!change) return current;
    const next = change(current);
    if (next.persistent === current.persistent) {
      await store.set({ entries: next.entries });
    } else if (next.persistent) {
      await chrome.storage.local.set({
        persistent: true,
        entries: next.entries,
      });
      await chrome.storage.session.remove("entries");
    } else {
      await chrome.storage.session.set({ entries: next.entries });
      await chrome.storage.local.set({ persistent: false, entries: [] });
      await chrome.storage.local.remove("entries");
    }
    return next;
  });
  queue = task.catch(() => {});
  return task;
}
export const log = (entry: Entry) =>
  history((h) => ({ ...h, entries: append(h.entries, entry) }));
