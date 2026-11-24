import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentTool } from "./agent";
import { object, type Dict } from "./model";
export const PROVIDERS = [
  {
    id: "gemini",
    label: "Gemini (Google)",
    placeholder: "AIza…",
    host: "generativelanguage.googleapis.com",
  },
  {
    id: "openai",
    label: "ChatGPT (OpenAI)",
    placeholder: "sk-…",
    host: "api.openai.com",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    placeholder: "sk-ant-…",
    host: "api.anthropic.com",
  },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]["id"];
export const isProvider = (v: unknown): v is ProviderId =>
  PROVIDERS.some((p) => p.id === v);
export interface ToolCall {
  id: string;
  name: string;
  /** Parsed arguments; null when the model sent arguments that are not a JSON object. */
  args: Dict | null;
}
export interface Turn {
  text: string[];
  calls: ToolCall[];
  stop: "done" | "tools" | "continue" | "refusal" | "length";
}
export interface ToolOutcome {
  call: ToolCall;
  content: string;
  isError: boolean;
}
export interface Context {
  system: string;
  tools: AgentTool[];
}
/** One chat with one provider. Keeps that provider's own message history. */
export interface Conversation {
  user(text: string): void;
  next(ctx: Context, signal: AbortSignal): Promise<Turn>;
  results(outcomes: ToolOutcome[]): void;
  /** Answers tool calls left open by an abort or error, so the history stays valid. */
  close(reason: string): void;
}
export function conversation(
  provider: ProviderId,
  key: string,
  model: string,
): Conversation {
  if (provider === "gemini") return gemini(key, model);
  if (provider === "openai") return openai(key, model);
  return anthropic(key, model);
}
const parseArgs = (raw: unknown): Dict | null => {
  if (object(raw)) return raw;
  if (typeof raw !== "string") return null;
  try {
    const v: unknown = JSON.parse(raw || "{}");
    return object(v) ? v : null;
  } catch {
    return null;
  }
};
const parseResult = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};
const RETRY_DELAYS = [2000, 5000, 10000];
const sleep = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
/** Overload and per-minute limits pass quickly; a "limit: 0" quota never does. */
export const transient = (status: number, message: string) =>
  [500, 502, 503, 504].includes(status) ||
  (status === 429 && !/limit: 0\b|per day/i.test(message));
async function http(provider: string, url: string, init: RequestInit) {
  let res: Response;
  let body: unknown;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, init);
    body = await res.json().catch(() => null);
    const raw =
      object(body) &&
      object(body.error) &&
      typeof body.error.message === "string"
        ? body.error.message
        : "";
    if (res.ok || attempt >= RETRY_DELAYS.length || !transient(res.status, raw))
      break;
    await sleep(RETRY_DELAYS[attempt], init.signal);
  }
  if (!res.ok) {
    const err = object(body) && object(body.error) ? body.error : {};
    const full = typeof err.message === "string" ? err.message : res.statusText;
    // Provider errors can run to many paragraphs; keep the first sentence or two for the chat.
    const message =
      full.length > 280 ? `${full.slice(0, 280).trimEnd()}…` : full;
    if (res.status === 429)
      throw Error(
        /limit: 0\b/.test(full)
          ? `${provider}: this model has no quota on your plan (free tier limit is 0). Pick another model in Agent settings.`
          : `${provider} rate limit or quota reached: ${message}`,
      );
    if (res.status === 401 || res.status === 403)
      throw Error(`${provider} rejected the API key: ${message}`);
    throw Error(
      transient(res.status, full)
        ? `${provider} is temporarily unavailable (${res.status}) after ${RETRY_DELAYS.length} retries: ${message}`
        : `${provider} API error ${res.status}: ${message}`,
    );
  }
  return object(body) ? body : {};
}
function pending(): { open: ToolCall[]; take(): ToolCall[] } {
  return {
    open: [],
    take() {
      const calls = this.open;
      this.open = [];
      return calls;
    },
  };
}

// ---------- Gemini (generateContent REST API) ----------
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
type GeminiPart = Dict & {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: Dict };
};
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
export function geminiTurn(data: Dict): { content: GeminiContent; turn: Turn } {
  const cand =
    Array.isArray(data.candidates) && object(data.candidates[0])
      ? data.candidates[0]
      : null;
  const content: GeminiContent =
    cand && object(cand.content) && Array.isArray(cand.content.parts)
      ? { role: "model", parts: cand.content.parts as GeminiPart[] }
      : { role: "model", parts: [] };
  const text = content.parts
    .filter((p) => typeof p.text === "string" && !p.thought && p.text.trim())
    .map((p) => (p.text as string).trim());
  const calls = content.parts
    .filter((p) => p.functionCall)
    .map((p, i) => ({
      id: p.functionCall?.id ?? `call-${i}`,
      name: p.functionCall?.name ?? "",
      args: parseArgs(p.functionCall?.args ?? {}),
    }));
  const reason =
    typeof cand?.finishReason === "string" ? cand.finishReason : "";
  const stop: Turn["stop"] = !cand
    ? "refusal"
    : calls.length
      ? "tools"
      : reason === "MAX_TOKENS"
        ? "length"
        : [
              "SAFETY",
              "PROHIBITED_CONTENT",
              "BLOCKLIST",
              "SPII",
              "RECITATION",
            ].includes(reason)
          ? "refusal"
          : "done";
  return { content, turn: { text, calls, stop } };
}
function gemini(key: string, model: string): Conversation {
  const contents: GeminiContent[] = [];
  const open = pending();
  const results = (outcomes: ToolOutcome[]) => {
    contents.push({
      role: "user",
      parts: outcomes.map(({ call, content, isError }) => ({
        functionResponse: {
          // Gemini 3 returns call ids and expects them back; older models send none.
          ...(call.id.startsWith("call-") ? {} : { id: call.id }),
          name: call.name,
          response: isError
            ? { error: content }
            : { result: parseResult(content) },
        },
      })),
    });
  };
  return {
    user: (text) => contents.push({ role: "user", parts: [{ text }] }),
    async next(ctx, signal) {
      const data = await http(
        "Gemini",
        `${GEMINI}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          signal,
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: ctx.system }] },
            contents,
            tools: [
              {
                functionDeclarations: ctx.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parametersJsonSchema: t.input_schema,
                })),
              },
            ],
          }),
        },
      );
      const { content, turn } = geminiTurn(data);
      // Parts go back unchanged: they carry thought signatures the next request needs.
      if (content.parts.length) contents.push(content);
      open.open = turn.calls;
      return turn;
    },
    results(outcomes) {
      open.take();
      results(outcomes);
    },
    close(reason) {
      const calls = open.take();
      if (calls.length)
        results(
          calls.map((call) => ({ call, content: reason, isError: true })),
        );
    },
  };
}
export async function geminiModels(key: string): Promise<string[]> {
  const data = await http("Gemini", `${GEMINI}/models?pageSize=1000`, {
    headers: { "x-goog-api-key": key },
  });
  const models = Array.isArray(data.models) ? data.models.filter(object) : [];
  return models
    .filter(
      (m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes("generateContent") &&
        typeof m.name === "string" &&
        m.name.startsWith("models/gemini") &&
        !/(tts|image|embedding|live|audio|robotics|computer-use)/.test(m.name),
    )
    .map((m) => (m.name as string).slice("models/".length))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

// ---------- OpenAI (Chat Completions REST API) ----------
type OpenAIMessage = Dict & { role: string };
export function openaiTurn(data: Dict): { message: OpenAIMessage; turn: Turn } {
  const choice =
    Array.isArray(data.choices) && object(data.choices[0])
      ? data.choices[0]
      : {};
  const msg = object(choice.message) ? choice.message : {};
  const toolCalls = Array.isArray(msg.tool_calls)
    ? msg.tool_calls.filter(object)
    : [];
  const calls = toolCalls.map((c) => {
    const fn = object(c.function) ? c.function : {};
    return {
      id: String(c.id ?? ""),
      name: String(fn.name ?? ""),
      args: parseArgs(fn.arguments),
    };
  });
  const text =
    typeof msg.content === "string" && msg.content.trim()
      ? [msg.content.trim()]
      : [];
  const reason = choice.finish_reason;
  const stop: Turn["stop"] =
    msg.refusal || reason === "content_filter"
      ? "refusal"
      : calls.length
        ? "tools"
        : reason === "length"
          ? "length"
          : "done";
  // Only fields the API accepts back as input.
  const message: OpenAIMessage = {
    role: "assistant",
    content: typeof msg.content === "string" ? msg.content : null,
  };
  if (toolCalls.length) message.tool_calls = toolCalls;
  return { message, turn: { text, calls, stop } };
}
function openai(key: string, model: string): Conversation {
  const messages: OpenAIMessage[] = [];
  const open = pending();
  const results = (outcomes: ToolOutcome[]) => {
    for (const { call, content } of outcomes)
      messages.push({ role: "tool", tool_call_id: call.id, content });
  };
  return {
    user: (text) => messages.push({ role: "user", content: text }),
    async next(ctx, signal) {
      const data = await http(
        "OpenAI",
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: ctx.system }, ...messages],
            tools: ctx.tools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.input_schema,
              },
            })),
          }),
        },
      );
      const { message, turn } = openaiTurn(data);
      messages.push(message);
      open.open = turn.calls;
      return turn;
    },
    results(outcomes) {
      open.take();
      results(outcomes);
    },
    close(reason) {
      results(
        open.take().map((call) => ({ call, content: reason, isError: true })),
      );
    },
  };
}
export async function openaiModels(key: string): Promise<string[]> {
  const data = await http("OpenAI", "https://api.openai.com/v1/models", {
    headers: { authorization: `Bearer ${key}` },
  });
  const models = Array.isArray(data.data) ? data.data.filter(object) : [];
  return models
    .map((m) => String(m.id ?? ""))
    .filter(
      (id) =>
        /^(gpt-|o\d|chatgpt)/.test(id) &&
        !/(audio|realtime|tts|transcribe|image|search|embedding|instruct|codex|oss|moderation|dall|deep-research)/.test(
          id,
        ),
    )
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

// ---------- Anthropic (official SDK) ----------
export const CLAUDE_MODELS = [
  "claude-opus-5-5",
  "claude-sonnet-5-5",
  "claude-haiku-5-5",
];
function anthropic(key: string, model: string): Conversation {
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  const messages: BetaMessageParam[] = [];
  const open = pending();
  const results = (outcomes: ToolOutcome[]) => {
    if (outcomes.length)
      messages.push({
        role: "user",
        content: outcomes.map(({ call, content, isError }) => ({
          type: "tool_result" as const,
          tool_use_id: call.id,
          content,
          is_error: isError,
        })),
      });
  };
  return {
    user: (text) => messages.push({ role: "user", content: text }),
    async next(ctx, signal) {
      try {
        const response = await client.beta.messages.create(
          {
            model,
            max_tokens: 16000,
            system: ctx.system,
            tools: ctx.tools,
            messages,
            output_config: { effort: "medium" },
            // Re-run on another model if a safety classifier declines (Haiku has no server-side fallback).
            ...(model.startsWith("claude-haiku")
              ? {}
              : {
                  betas: ["server-side-fallback-2026-07-01"],
                  fallbacks: "default" as const,
                }),
          },
          { signal },
        );
        messages.push({ role: "assistant", content: response.content });
        const calls = response.content
          .filter((b): b is BetaToolUseBlock => b.type === "tool_use")
          .map((b) => ({ id: b.id, name: b.name, args: parseArgs(b.input) }));
        open.open = calls;
        const text = response.content.flatMap((b) =>
          b.type === "text" && b.text.trim() ? [b.text.trim()] : [],
        );
        const r = response.stop_reason;
        const stop: Turn["stop"] =
          r === "pause_turn"
            ? "continue"
            : r === "refusal"
              ? "refusal"
              : r === "max_tokens"
                ? "length"
                : r === "tool_use"
                  ? "tools"
                  : "done";
        return { text, calls, stop };
      } catch (e) {
        if (signal.aborted) throw e;
        if (e instanceof Anthropic.AuthenticationError)
          throw Error("Anthropic rejected the API key.");
        if (e instanceof Anthropic.RateLimitError)
          throw Error("Anthropic rate limit reached. Try again shortly.");
        if (e instanceof Anthropic.APIError)
          throw Error(`Anthropic API error ${e.status ?? ""}: ${e.message}`);
        throw e;
      }
    },
    results(outcomes) {
      open.take();
      results(outcomes);
    },
    close(reason) {
      results(
        open.take().map((call) => ({ call, content: reason, isError: true })),
      );
    },
  };
}

/** Default model after a provider's list loads: a fast, inexpensive model with tool calling. */
export function preferredModel(provider: ProviderId, models: string[]): string {
  if (provider === "anthropic") return "claude-opus-5-5";
  const pick =
    provider === "gemini"
      ? // Plain "gemini-<version>-flash" models are the ones normally offered on the free tier.
        (models.find((m) => /^gemini-[\d.]+-flash$/.test(m)) ??
        models.find(
          (m) => /flash/.test(m) && !/(lite|preview|exp|thinking)/.test(m),
        ) ??
        models.find((m) => /flash/.test(m)))
      : (models.find((m) => /^gpt-[\d.]+-mini$/.test(m)) ??
        models.find((m) => /^gpt-[\d.]+$/.test(m)));
  return pick ?? models[0] ?? "";
}
