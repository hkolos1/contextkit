import { Component, computed, input, signal } from "@angular/core";
import { agentTools, systemPrompt } from "../core/agent";
import { errorMessage, request } from "../core/bridge";
import {
  object,
  pretty,
  safety,
  type Snapshot,
  type Tool,
} from "../core/model";
import {
  CLAUDE_MODELS,
  conversation,
  geminiModels,
  isProvider,
  openaiModels,
  PROVIDERS,
  preferredModel,
  type Conversation,
  type ProviderId,
  type ToolCall,
  type ToolOutcome,
} from "../core/providers";
type Status = "approval" | "running" | "done" | "error" | "declined";
export type Step =
  | { kind: "user" | "text"; text: string }
  | { kind: "notice"; text: string; error?: boolean }
  | {
      kind: "tool";
      id: string;
      name: string;
      level: string;
      args: unknown;
      status: Status;
      duration?: number;
      response?: unknown;
    };
type PerProvider = Partial<Record<ProviderId, string>>;
const MAX_TURNS = 25;
// Long enough for tools that wait on the user in the page (e.g. payment authorization).
const TOOL_TIMEOUT = 300000;
@Component({ selector: "tp-agent", templateUrl: "agent.html" })
export class Agent {
  snap = input.required<Snapshot | null>();
  windowId = input.required<number>();
  providers = PROVIDERS;
  pretty = pretty;
  provider = signal<ProviderId>("gemini");
  keys = signal<PerProvider>({});
  chosen = signal<PerProvider>({});
  catalog = signal<Record<string, string[]>>({ anthropic: CLAUDE_MODELS });
  listError = signal("");
  editing = signal(false);
  reveal = signal(false);
  prompt = signal("");
  steps = signal<Step[]>([]);
  busy = signal(false);
  autoApprove = signal(false);
  key = computed(() => this.keys()[this.provider()] ?? "");
  models = computed(() => this.catalog()[this.provider()] ?? []);
  model = computed(() => this.chosen()[this.provider()] ?? "");
  info = computed(
    () => PROVIDERS.find((p) => p.id === this.provider()) ?? PROVIDERS[0],
  );
  waiting = computed(() =>
    this.steps().some(
      (s) =>
        s.kind === "tool" &&
        (s.status === "approval" || s.status === "running"),
    ),
  );
  ready = computed(
    () =>
      !!this.snap()?.executable &&
      !!this.snap()?.tools.length &&
      !!this.model(),
  );
  private chat?: Conversation;
  private abort?: AbortController;
  private decide?: (ok: boolean) => void;
  private seq = 0;
  constructor() {
    void chrome.storage.local
      .get(["agentProvider", "agentKeys", "agentModels", "anthropicKey"])
      .then((s) => {
        const keys: PerProvider = object(s.agentKeys)
          ? (s.agentKeys as PerProvider)
          : {};
        // Keys saved by the first Claude-only version.
        if (!keys.anthropic && typeof s.anthropicKey === "string")
          keys.anthropic = s.anthropicKey;
        this.keys.set(keys);
        if (object(s.agentModels))
          this.chosen.set(s.agentModels as PerProvider);
        if (isProvider(s.agentProvider)) this.provider.set(s.agentProvider);
        this.editing.set(!this.key());
        void this.loadModels();
      });
  }
  private persist() {
    void chrome.storage.local.set({
      agentProvider: this.provider(),
      agentKeys: this.keys(),
      agentModels: this.chosen(),
    });
    void chrome.storage.local.remove("anthropicKey");
  }
  /** Lists the models the saved key can use, and picks a default if none is chosen. */
  async loadModels() {
    const provider = this.provider();
    const key = this.key();
    this.listError.set("");
    if (!key || provider === "anthropic") {
      if (provider === "anthropic" && !this.chosen().anthropic)
        this.setModel(preferredModel("anthropic", []));
      return;
    }
    try {
      const list =
        provider === "gemini"
          ? await geminiModels(key)
          : await openaiModels(key);
      this.catalog.update((c) => ({ ...c, [provider]: list }));
      if (!this.chosen()[provider])
        this.setModel(preferredModel(provider, list));
    } catch (e) {
      this.listError.set(errorMessage(e));
    }
  }
  setProvider(id: string) {
    if (!isProvider(id) || id === this.provider()) return;
    this.reset();
    this.provider.set(id);
    this.persist();
    void this.loadModels();
  }
  setModel(id: string) {
    const model = id.trim();
    if (model === this.model()) return;
    this.reset();
    this.chosen.update((c) => ({ ...c, [this.provider()]: model }));
    this.persist();
  }
  async saveKey(value: string) {
    const key = value.trim();
    if (!key) return;
    this.keys.update((k) => ({ ...k, [this.provider()]: key }));
    this.persist();
    this.reset();
    await this.loadModels();
    if (!this.listError()) this.editing.set(false);
  }
  removeKey() {
    this.keys.update((k) => {
      const next = { ...k };
      delete next[this.provider()];
      return next;
    });
    this.persist();
    this.reset();
    this.editing.set(true);
  }
  reset() {
    this.stop();
    this.chat = undefined;
    this.steps.set([]);
  }
  stop() {
    this.abort?.abort();
    this.decide?.(false);
  }
  enter(e: KeyboardEvent) {
    if (e.shiftKey || e.isComposing) return;
    e.preventDefault();
    void this.send();
  }
  approve(ok: boolean) {
    this.decide?.(ok);
  }
  private add(step: Step) {
    this.steps.update((s) => [...s, step]);
  }
  private patch(id: string, change: Partial<Extract<Step, { kind: "tool" }>>) {
    this.steps.update((s) =>
      s.map((x) =>
        x.kind === "tool" && x.id === id ? { ...x, ...change } : x,
      ),
    );
  }
  async send() {
    const snap = this.snap();
    const text = this.prompt().trim();
    if (
      !snap?.executable ||
      !this.key() ||
      !this.model() ||
      !text ||
      this.busy()
    )
      return;
    const { defs, byName } = agentTools(snap.tools);
    this.chat ??= conversation(this.provider(), this.key(), this.model());
    const chat = this.chat;
    const abort = new AbortController();
    this.abort = abort;
    this.prompt.set("");
    this.add({ kind: "user", text });
    chat.user(text);
    this.busy.set(true);
    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const t = await chat.next(
          { system: systemPrompt(snap.origin), tools: defs },
          abort.signal,
        );
        for (const line of t.text) this.add({ kind: "text", text: line });
        if (t.stop === "continue") continue;
        if (t.stop === "refusal" || t.stop === "length") {
          this.add({
            kind: "notice",
            error: true,
            text:
              t.stop === "refusal"
                ? "The model declined this request."
                : "The reply hit the output limit.",
          });
          chat.close("The reply ended before this tool ran.");
          return;
        }
        if (t.stop !== "tools") return;
        const outcomes: ToolOutcome[] = [];
        for (const call of t.calls)
          outcomes.push(
            await this.call(call, byName.get(call.name), snap, abort.signal),
          );
        chat.results(outcomes);
      }
      this.add({
        kind: "notice",
        text: `Stopped after ${MAX_TURNS} model turns.`,
        error: true,
      });
    } catch (e) {
      chat.close("Cancelled before this tool ran.");
      this.add({
        kind: "notice",
        error: !abort.signal.aborted,
        text: abort.signal.aborted ? "Stopped." : errorMessage(e),
      });
    } finally {
      this.busy.set(false);
      this.decide = undefined;
    }
  }
  private async call(
    call: ToolCall,
    tool: Tool | undefined,
    snap: Snapshot,
    signal: AbortSignal,
  ): Promise<ToolOutcome> {
    const done = (content: string, isError = false) => ({
      call,
      content,
      isError,
    });
    if (!tool) return done(`Unknown tool ${call.name}.`, true);
    if (!call.args) return done("Arguments must be a JSON object.", true);
    if (signal.aborted) throw Error("Stopped.");
    const id = `${++this.seq}`;
    const level = safety(tool);
    // Read-only tools run directly; writes need approval unless auto-approved, and
    // consequential or destructive tools always do.
    const ask =
      level !== "Read-only" &&
      !(this.autoApprove() && level === "Unclassified");
    this.add({
      kind: "tool",
      id,
      name: tool.name,
      level,
      args: call.args,
      status: ask ? "approval" : "running",
    });
    if (ask) {
      const ok = await new Promise<boolean>((resolve) => {
        this.decide = resolve;
      });
      this.decide = undefined;
      if (signal.aborted) throw Error("Stopped.");
      if (!ok) {
        this.patch(id, { status: "declined" });
        return done("The user declined this tool call.", true);
      }
      this.patch(id, { status: "running" });
    }
    try {
      const entry = await request({
        kind: "run",
        windowId: this.windowId(),
        target: {
          tab: snap.tab,
          origin: snap.origin,
          documentId: snap.documentId,
        },
        tool,
        args: call.args,
        confirmed: level !== "Read-only",
        timeout: TOOL_TIMEOUT,
      });
      const failed = entry.kind === "Error";
      this.patch(id, {
        status: failed ? "error" : "done",
        duration: entry.duration,
        response: entry.response,
      });
      return done(
        typeof entry.response === "string"
          ? entry.response
          : JSON.stringify(entry.response ?? null),
        failed,
      );
    } catch (e) {
      this.patch(id, { status: "error", response: errorMessage(e) });
      return done(errorMessage(e), true);
    }
  }
}
