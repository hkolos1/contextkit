import { object, type Tool } from "./model";
export interface AgentTool {
  name: string;
  description: string;
  input_schema: { type: "object"; [k: string]: unknown };
}
/** Maps WebMCP tools to Claude tool definitions. Claude names allow only [a-zA-Z0-9_-]{1,64}. */
export function agentTools(tools: Tool[]) {
  const byName = new Map<string, Tool>();
  const defs: AgentTool[] = tools.map((t) => {
    const base = t.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "tool";
    let name = base;
    for (let i = 2; byName.has(name); i++) name = `${base}_${i}`;
    byName.set(name, t);
    const schema = object(t.inputSchema) ? t.inputSchema : {};
    return {
      name,
      description:
        [t.title, t.description].filter(Boolean).join(" — ") ||
        `WebMCP tool ${t.name}`,
      input_schema: { ...schema, type: "object" },
    };
  });
  return { defs, byName };
}
export const systemPrompt = (origin: string) =>
  `You operate the website ${origin} for the user through the WebMCP tools it registers. ` +
  "Use the tools to do what the user asks and report what happened in a few short sentences. " +
  "Base every statement about the site on tool results; never invent products, prices, orders or statuses. " +
  "If a tool needs information you do not have, such as personal or contact details, ask the user instead of guessing. " +
  "The user approves state-changing tool calls in the side panel; if a call is declined, do not retry it unless the user asks. " +
  "Never ask for or handle card numbers, CVV codes or passwords: payment details are entered by the user on the page itself.";
