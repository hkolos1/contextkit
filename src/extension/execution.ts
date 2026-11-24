import { errorMessage, type Command } from "../core/bridge";
import { bounded, type Entry } from "../core/model";
import { log } from "./storage";
import { active, page } from "./target";
export async function execute(m: Extract<Command, { kind: "run" }>) {
  bounded(m.args, 48000);
  const tab = await active(m.windowId);
  if (tab.id !== m.target.tab || tab.origin !== m.target.origin)
    throw Error("Tab context changed. Refresh before running.");
  const started = performance.now();
  const event: Entry = {
    kind: "Success",
    name: m.tool.name,
    origin: tab.origin,
    time: new Date().toISOString(),
    request: m.args,
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    event.response = await Promise.race([
      page(tab.id, m.target.documentId, {
        kind: "invoke",
        origin: tab.origin,
        tool: m.tool,
        args: m.args,
        confirmed: m.confirmed,
      }),
      new Promise((_, reject) => {
        const wait = m.timeout ?? 25000;
        timer = setTimeout(
          () =>
            reject(
              Error(
                `No result within ${wait / 1000} seconds. The action may have completed.`,
              ),
            ),
          wait,
        );
      }),
    ]);
  } catch (e) {
    event.kind = "Error";
    event.response = errorMessage(e).slice(0, 48000);
  } finally {
    clearTimeout(timer);
  }
  event.duration = Math.round(performance.now() - started);
  await log(event);
  return event;
}
