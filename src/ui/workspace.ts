import { Component, computed, signal } from "@angular/core";
import { Popup } from "./popup";
import { Field } from "./field";
import { request, errorMessage } from "../core/bridge";
import {
  pretty,
  safety,
  parseTools,
  bounded,
  object,
  type Snapshot,
  type Entry,
  type Tool,
  type Theme,
} from "../core/model";
import { audit } from "../core/audit";
import { emptySchema, initial, validate } from "../core/schema";
import { download, report } from "./export";
@Component({
  selector: "ck-app",
  imports: [Field, Popup],
  templateUrl: "workspace.html",
})
export class Workspace {
  popup = document.body.classList.contains("popup");
  tabs = ["Tools", "Playground", "Activity", "Audit"];
  icons = ["wrench", "terminal", "activity", "shield-check"];
  section = signal("Tools");
  settings = signal(false);
  snap = signal<Snapshot | null>(null);
  offline = signal<Tool[] | null>(null);
  filename = signal("");
  loading = signal(true);
  problem = signal("");
  notice = signal("");
  search = signal("");
  filter = signal("All");
  activityFilter = signal("All");
  theme = signal<Theme>("system");
  history = signal<Entry[]>([]);
  persistent = signal(false);
  chosen = signal(0);
  raw = signal("{}");
  mode = signal("Form");
  result = signal<Entry | null>(null);
  busy = signal(false);
  tools = computed(() => this.offline() ?? this.snap()?.tools ?? []);
  tool = computed(() => this.tools()[this.chosen()]);
  schema = computed(() => this.tool()?.inputSchema ?? emptySchema);
  findings = computed(() => audit(this.tools()));
  origin = computed(() =>
    this.offline() !== null
      ? this.filename()
      : (this.snap()?.origin ?? "Active tab"),
  );
  filtered = computed(() =>
    this.tools().filter(
      (t) =>
        `${t.name} ${t.description}`
          .toLowerCase()
          .includes(this.search().toLowerCase()) &&
        (this.filter() === "All" || safety(t) === this.filter()),
    ),
  );
  events = computed(() =>
    this.history().filter(
      (e) =>
        this.activityFilter() === "All" || e.kind === this.activityFilter(),
    ),
  );
  parsed = computed(() => {
    try {
      const v: unknown = JSON.parse(this.raw());
      bounded(v, 48000);
      return { v, errors: validate(this.schema(), v) };
    } catch (e) {
      return { v: null, errors: [errorMessage(e)] };
    }
  });
  state = computed(() =>
    this.offline() !== null
      ? "Offline file"
      : this.loading()
        ? "Inspecting"
        : this.problem()
          ? "Access needed"
          : this.snap()?.available
            ? "WebMCP available"
            : "Unavailable",
  );
  pretty = pretty;
  safety = safety;
  download = download;
  windowId = -1;
  private revision = 0;
  private tabId = -1;
  constructor() {
    void this.start().catch((e) => {
      this.loading.set(false);
      this.problem.set(errorMessage(e));
    });
  }
  async start() {
    this.windowId = (await chrome.windows.getCurrent()).id ?? -1;
    this.applyTheme((await chrome.storage.local.get("theme")).theme);
    chrome.tabs.onActivated.addListener((a) => {
      if (a.windowId === this.windowId && this.offline() === null)
        void this.refresh();
    });
    chrome.tabs.onUpdated.addListener((id, change, tab) => {
      if (
        tab.active &&
        tab.windowId === this.windowId &&
        (change.status || change.url) &&
        this.offline() === null
      ) {
        this.tabId = id;
        void this.refresh();
      }
    });
    chrome.runtime.onMessage.addListener((m, s) => {
      if (
        m?.kind === "toolchange" &&
        s.tab?.id === this.tabId &&
        s.documentId === this.snap()?.documentId &&
        this.offline() === null
      )
        void this.refresh();
    });
    chrome.storage.onChanged.addListener((ch) => {
      if (ch.theme) this.applyTheme(ch.theme.newValue);
      if (ch.entries || ch.persistent) void this.loadHistory();
    });
    await Promise.all([this.refresh(), this.loadHistory()]);
  }
  async loadHistory() {
    const h = await request({ kind: "history" });
    this.history.set(h.entries);
    this.persistent.set(h.persistent);
  }
  applyTheme(t: unknown) {
    const theme = t === "dark" || t === "light" ? t : "system";
    this.theme.set(theme);
    document.documentElement.dataset.theme = theme;
  }
  setTheme(t: string) {
    void chrome.storage.local.set({ theme: t });
    this.applyTheme(t);
  }
  async refresh() {
    this.dismiss();
    const token = ++this.revision;
    this.offline.set(null);
    this.snap.set(null);
    this.loading.set(true);
    this.problem.set("");
    this.notice.set("");
    this.result.set(null);
    try {
      const snap = await request({ kind: "inspect", windowId: this.windowId });
      if (token === this.revision) {
        this.snap.set(snap);
        this.tabId = snap.tab;
        this.select(0);
      }
    } catch (e) {
      if (token === this.revision) this.problem.set(errorMessage(e));
    } finally {
      if (token === this.revision) this.loading.set(false);
    }
  }
  select(i: number) {
    this.chosen.set(i);
    this.raw.set(pretty(initial(this.schema())) ?? "{}");
    this.result.set(null);
  }
  selectTool(t: Tool) {
    this.select(this.tools().indexOf(t));
    this.section.set("Playground");
  }
  private pending?: {
    dialog: HTMLDialogElement;
    tool: Tool;
    source: Snapshot;
    input: string;
  };
  prepare(dialog: HTMLDialogElement) {
    const tool = this.tool(),
      source = this.snap();
    if (
      !tool ||
      !source?.executable ||
      this.parsed().errors.length ||
      this.busy()
    )
      return;
    if (safety(tool) === "Read-only") {
      void this.run(false);
      return;
    }
    this.pending = { dialog, tool, source, input: this.raw() };
    dialog.showModal();
  }
  confirmRun() {
    const p = this.pending;
    this.dismiss();
    if (
      p &&
      p.tool === this.tool() &&
      p.source === this.snap() &&
      p.input === this.raw()
    )
      void this.run(true);
  }
  dismiss() {
    this.pending?.dialog.close();
    this.pending = undefined;
  }
  private async run(confirmed: boolean) {
    const snap = this.snap(),
      tool = this.tool(),
      input = this.parsed(),
      revision = this.revision;
    if (
      !snap?.executable ||
      !tool ||
      input.errors.length ||
      this.busy() ||
      this.offline() !== null
    )
      return;
    this.busy.set(true);
    this.notice.set("");
    try {
      const result = await request({
        kind: "run",
        windowId: this.windowId,
        target: {
          tab: snap.tab,
          origin: snap.origin,
          documentId: snap.documentId,
        },
        tool,
        args: input.v,
        confirmed,
      });
      if (revision === this.revision && this.tool() === tool)
        this.result.set(result);
    } catch (e) {
      this.notice.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  openPanel() {
    void chrome.sidePanel.open({ windowId: this.windowId }).then(
      () => window.close(),
      (e) => this.notice.set(errorMessage(e)),
    );
  }
  async copy(v: unknown) {
    try {
      await navigator.clipboard.writeText(pretty(v));
      this.notice.set("Copied to clipboard.");
    } catch (e) {
      this.notice.set(errorMessage(e));
    }
  }
  async importFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error("Choose a file smaller than 1 MB.");
      const data: unknown = JSON.parse(await file.text());
      const tools = parseTools(object(data) ? data.tools : data);
      ++this.revision;
      this.offline.set(tools);
      this.filename.set(file.name);
      this.snap.set(null);
      this.loading.set(false);
      this.problem.set("");
      this.notice.set("");
      this.search.set("");
      this.filter.set("All");
      this.section.set("Tools");
      this.select(0);
    } catch (e) {
      this.notice.set(errorMessage(e));
    }
  }
  exportTools() {
    download("tools.json", { version: 1, tools: this.tools() });
  }
  exportAudit(html: boolean) {
    if (html)
      download("audit.html", report(this.origin(), this.findings()), true);
    else
      download("audit.json", {
        origin: this.origin(),
        time: new Date().toISOString(),
        findings: this.findings(),
      });
  }
  async persist(enabled: boolean) {
    try {
      await request({ kind: "persist", enabled });
      await this.loadHistory();
    } catch (e) {
      this.notice.set(errorMessage(e));
    }
  }
  async clear() {
    if (confirm("Clear all ContextKit activity on this browser?")) {
      await request({ kind: "clear" });
      await this.loadHistory();
    }
  }
}
