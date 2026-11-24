export type Dict = Record<string, unknown>;
export const object = (value: unknown): value is Dict =>
  !!value && typeof value === "object" && !Array.isArray(value);
export interface Tool {
  name: string;
  description: string;
  title?: string;
  outputSchema?: unknown;
  inputSchema?: unknown;
  annotations?: Dict;
  origin?: string;
  registration?: "declarative" | "imperative";
}
export function safety(t: Tool) {
  if (t.annotations?.destructiveHint === true) return "Destructive";
  if (t.annotations?.consequentialHint === true) return "Consequential";
  if (t.annotations?.readOnlyHint === true) return "Read-only";
  return "Unclassified";
}
export const pretty = (v: unknown) => JSON.stringify(v, null, 2);
export function bounded(v: unknown, limit = 160000): void {
  let count = 0;
  function visit(x: unknown, depth: number) {
    if (depth > 24 || ++count > 12000)
      throw Error("Data exceeds the inspection limit.");
    if (typeof x === "string") count += Math.floor(x.length / 64);
    else if (x && typeof x === "object")
      for (const [k, val] of Object.entries(x)) {
        if (k.length > 2048)
          throw Error("Property name exceeds the inspection limit.");
        visit(val, depth + 1);
      }
  }
  visit(v, 0);
  if ((JSON.stringify(v)?.length ?? 0) > limit)
    throw Error("Payload exceeds the size limit.");
}
export function parseTools(value: unknown): Tool[] {
  bounded(value, 900000);
  if (!Array.isArray(value) || value.length > 150)
    throw Error("Expected up to 150 tool definitions.");
  return value.map((t: unknown) => {
    if (
      !object(t) ||
      typeof t.name !== "string" ||
      (t.description !== undefined && typeof t.description !== "string")
    )
      throw Error("Invalid tool definition.");
    return {
      name: t.name,
      description: String(t.description ?? ""),
      title: typeof t.title === "string" ? t.title : undefined,
      outputSchema: t.outputSchema,
      inputSchema: t.inputSchema,
      annotations: object(t.annotations) ? t.annotations : undefined,
      origin: typeof t.origin === "string" ? t.origin : undefined,
      registration:
        t.registration === "imperative" || t.registration === "declarative"
          ? t.registration
          : undefined,
    };
  });
}
export interface Snapshot {
  tab: number;
  documentId: string;
  origin: string;
  available: boolean;
  executable: boolean;
  tools: Tool[];
}
export interface Entry {
  time: string;
  origin: string;
  name: string;
  kind: "Discovery" | "Success" | "Error";
  duration?: number;
  request?: unknown;
  response?: unknown;
}
export type Theme = "dark" | "light" | "system";
