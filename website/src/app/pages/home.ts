import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import { Icon } from "../icon";
import { installHref, site } from "../site";

interface View {
  id: string;
  label: string;
  alt: string;
}

@Component({
  selector: "tp-home",
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./home.html",
})
export default class Home {
  readonly site = site;
  readonly installHref = installHref;
  readonly storeReady = !!site.chromeWebStore;

  readonly views: View[] = [
    {
      id: "tools",
      label: "Discover",
      alt: "Toolpeek tool explorer listing seven WebMCP tools from the demo page, with calculate_total expanded to show its parameters.",
    },
    {
      id: "playground",
      label: "Execute",
      alt: "Toolpeek playground running get_item_details with id A1 and showing a successful JSON response.",
    },
    {
      id: "agent",
      label: "Agent",
      alt: "Toolpeek Agent tab asking to connect an AI model, with provider and API key fields.",
    },
    {
      id: "audit",
      label: "Audit",
      alt: "Toolpeek audit view listing findings for the demo page's tool definitions.",
    },
  ];
  readonly active = signal(0);

  readonly features = [
    {
      icon: "search",
      title: "Discover tools",
      text: "See every WebMCP tool the active page registers, live. Search by name or description and filter by safety hint.",
    },
    {
      icon: "eye",
      title: "Inspect schemas",
      text: "Read parameters, types, annotations and the full JSON definition. Copy, export or import tool inventories.",
    },
    {
      icon: "terminal",
      title: "Run tools by hand",
      text: "Fill a generated form or raw JSON, validate it against the schema and run it. State-changing tools ask first.",
    },
    {
      icon: "bot",
      title: "Let a model drive",
      text: "Describe a task and Gemini, ChatGPT or Claude calls the page's tools with your own API key. Writes wait for approval.",
    },
    {
      icon: "activity",
      title: "Review every call",
      text: "Arguments, responses, durations and errors for each run and inventory change, exportable as JSON.",
    },
    {
      icon: "shield-check",
      title: "Audit definitions",
      text: "Flag spec issues, missing safety hints and risky metadata. Save the findings as JSON or a standalone HTML report.",
    },
  ];

  readonly sourceSteps = `git clone \\
  ${site.repo}
cd toolpeek
npm ci
npm run build`;

  private paused = false;

  constructor() {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = setInterval(() => {
      if (!this.paused && document.visibilityState === "visible")
        this.active.update((i) => (i + 1) % this.views.length);
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  show(i: number) {
    this.paused = true;
    this.active.set(i);
  }

  /** Arrow keys move between showcase tabs (WAI-ARIA tabs pattern). */
  key(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (this.active() + step + this.views.length) % this.views.length;
    this.show(next);
    (
      (e.currentTarget as HTMLElement).querySelectorAll("button")[next] as
        | HTMLButtonElement
        | undefined
    )?.focus();
  }
}
