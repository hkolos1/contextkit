import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  viewChild,
} from "@angular/core";
import { webglAvailable } from "./three/stage";

/** This site's own WebMCP tool names (see webmcp.ts). */
const tools = [
  "get_product_info",
  "list_features",
  "get_install_steps",
  "get_privacy_summary",
  "open_section",
];

/** 3D view of a page, its tools and an agent calling them. Renders nothing without WebGL. */
@Component({
  selector: "tp-constellation",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="block h-full w-full"></canvas>`,
  host: { "aria-hidden": "true", class: "block" },
})
export class Constellation {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!webglAvailable()) return;
      document.fonts
        .load("500 44px 'Geist Mono'")
        .catch(() => [])
        .then(() => import("./three/constellation-scene"))
        .then(({ constellationScene }) =>
          destroyRef.onDestroy(constellationScene(this.canvas().nativeElement, tools)),
        )
        .catch(() => {});
    });
  }
}
