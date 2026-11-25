import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** Lucide icon from /icons, tinted with currentColor through a CSS mask. */
@Component({
  selector: "tp-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
  host: {
    "aria-hidden": "true",
    class: "inline-block shrink-0 bg-current",
    "[style.mask]": "'url(/icons/' + name() + '.svg) center / contain no-repeat'",
    "[style.width.px]": "size()",
    "[style.height.px]": "size()",
  },
})
export class Icon {
  name = input.required<string>();
  size = input(16);
}
