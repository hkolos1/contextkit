import { ChangeDetectionStrategy, Component } from "@angular/core";
import { site } from "../site";

/** Mirrors PRIVACY.md in the repository root. Update both together. */
@Component({
  selector: "tp-privacy",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./privacy.html",
  host: { class: "block" },
})
export default class Privacy {
  readonly site = site;
}
