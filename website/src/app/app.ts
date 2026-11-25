import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
} from "@angular/core";
import { Meta } from "@angular/platform-browser";
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from "@angular/router";
import { filter } from "rxjs";
import { Icon } from "./icon";
import { installHref, site } from "./site";
import { registerSiteTools } from "./webmcp";

const description =
  "Toolpeek is an open-source Chrome extension for discovering, inspecting and running the WebMCP tools a website exposes to AI agents.";

@Component({
  selector: "tp-root",
  imports: [RouterOutlet, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.html",
})
export class App {
  readonly site = site;
  readonly installHref = installHref;
  readonly year = new Date().getFullYear();

  constructor() {
    const meta = inject(Meta);
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    afterNextRender(() => void registerSiteTools(router));
    router
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        let r = route;
        while (r.firstChild) r = r.firstChild;
        const path = e.urlAfterRedirects.split(/[?#]/)[0];
        const url = site.url + (path === "/" ? "/" : path);
        const text = r.snapshot.data["description"] ?? description;
        meta.updateTag({ name: "description", content: text });
        meta.updateTag({ property: "og:description", content: text });
        meta.updateTag({ property: "og:url", content: url });
        document.querySelector("link[rel=canonical]")?.setAttribute("href", url);
      });
  }
}
