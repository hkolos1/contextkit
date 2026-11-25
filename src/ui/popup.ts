import { Component, input, output } from "@angular/core";
import { safety, type Tool } from "../core/model";
@Component({ selector: "tp-popup", templateUrl: "popup.html" })
export class Popup {
  tools = input.required<Tool[]>();
  loading = input(false);
  ready = input(false);
  open = output<void>();
  safety = safety;
}
