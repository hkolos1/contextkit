import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { webglAvailable } from "./three/stage";

/** Floating 3D {•} mark in the hero; the flat SVG symbol until (or unless) WebGL loads. */
@Component({
  selector: "tp-logo3d",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!ready()) {
      <img src="/brand/symbol.svg" alt="" class="mx-auto size-16 rounded-2xl" />
    }
    <canvas #canvas class="h-full w-full" [class.hidden]="!ready()"></canvas>
  `,
  host: { "aria-hidden": "true", class: "grid place-items-center" },
})
export class Logo3d {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  readonly ready = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!webglAvailable()) return;
      import("./three/logo-scene")
        .then(({ logoScene }) => {
          this.ready.set(true);
          destroyRef.onDestroy(logoScene(this.canvas().nativeElement));
        })
        .catch(() => {});
    });
  }
}
