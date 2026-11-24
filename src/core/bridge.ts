import { object, type Entry, type Snapshot, type Tool } from "./model";
export type Target = Pick<Snapshot, "tab" | "origin" | "documentId">;
export type Command =
  | { kind: "inspect"; windowId: number }
  | {
      kind: "run";
      windowId: number;
      target: Target;
      tool: Tool;
      args: unknown;
      confirmed: boolean;
      /** Milliseconds to wait for the page; defaults to 25 seconds. */
      timeout?: number;
    }
  | { kind: "history" | "clear" }
  | { kind: "persist"; enabled: boolean };
export type PageCommand =
  | { kind: "discover" }
  | {
      kind: "invoke";
      origin: string;
      tool: Tool;
      args: unknown;
      confirmed: boolean;
    };
export type PageSnapshot = Omit<Snapshot, "tab" | "documentId">;
export type Reply<T> = { ok: true; value: T } | { ok: false; error: string };
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
export function respond<T>(promise: Promise<T>, send: (v: Reply<T>) => void) {
  promise.then(
    (value) => send({ ok: true, value }),
    (e) => send({ ok: false, error: errorMessage(e) }),
  );
  return true;
}
export async function unwrap<T>(promise: Promise<Reply<T>>): Promise<T> {
  const r = await promise;
  if (!r?.ok)
    throw Error(r?.error ?? "Connection closed. Inspect the tab again.");
  return r.value;
}
export function trustedUI(sender: chrome.runtime.MessageSender, base: string) {
  return (
    sender.url === `${base}popup.html` || sender.url === `${base}panel.html`
  );
}
export function isCommand(v: unknown): v is Command {
  if (!object(v)) return false;
  switch (v.kind) {
    case "clear":
    case "history":
      return true;
    case "persist":
      return typeof v.enabled === "boolean";
    case "inspect":
      return Number.isInteger(v.windowId);
    case "run":
      return (
        Number.isInteger(v.windowId) &&
        object(v.target) &&
        Number.isInteger(v.target.tab) &&
        typeof v.target.documentId === "string" &&
        typeof v.target.origin === "string" &&
        object(v.tool) &&
        typeof v.tool.name === "string" &&
        object(v.args) &&
        typeof v.confirmed === "boolean" &&
        (v.timeout === undefined ||
          (Number.isInteger(v.timeout) &&
            (v.timeout as number) >= 1000 &&
            (v.timeout as number) <= 300000))
      );
    default:
      return false;
  }
}
export interface History {
  entries: Entry[];
  persistent: boolean;
}
export function request(
  message: Extract<Command, { kind: "inspect" }>,
): Promise<Snapshot>;
export function request(
  message: Extract<Command, { kind: "run" }>,
): Promise<Entry>;
export function request(
  message: Exclude<Command, { kind: "inspect" | "run" }>,
): Promise<History>;
export function request(message: Command) {
  return unwrap(chrome.runtime.sendMessage(message));
}
