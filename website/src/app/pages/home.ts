import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import { Globe } from "../globe";
import { Icon } from "../icon";
import { features, installHref, site } from "../site";
import { webmcp } from "../webmcp";

interface View {
  id: string;
  label: string;
  alt: string;
}

@Component({
  selector: "tp-home",
  imports: [Icon, Globe],
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

  readonly features = features;
  readonly webmcp = webmcp;

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
