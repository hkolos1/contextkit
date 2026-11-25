import { Component, computed, input, output } from "@angular/core";
import { object, pretty } from "../core/model";
import { initial } from "../core/schema";
@Component({
  selector: "tp-field",
  templateUrl:"field.html",
})
export class Field {
  schema = input.required<unknown>();
  value = input.required<unknown>();
  label = input("Arguments");
  changed = output<unknown>();
  pretty = pretty;
  definition = computed(() => {
    const s = this.schema();
    return object(s) ? s : {};
  });
  type = computed(
    () =>
      this.definition().type ??
      (this.definition().properties ? "object" : "string"),
  );
  numeric = computed(
    () => this.type() === "number" || this.type() === "integer",
  );
  fields = computed(() => {
    const props = this.definition().properties;
    return object(props) ? Object.entries(props) : [];
  });
  choices = computed(() => {
    const choices = this.definition().enum;
    return Array.isArray(choices) ? choices : [];
  });
  record = computed(() => {
    const v = this.value();
    return object(v) ? v : {};
  });
  list = computed(() => {
    const v = this.value();
    return Array.isArray(v) ? v : [];
  });
  has(k: string) {
    return Object.hasOwn(this.record(), k);
  }
  required(k: string) {
    const r = this.definition().required;
    return Array.isArray(r) && r.includes(k);
  }
  description(s: unknown) {
    return object(s) && typeof s.description === "string" ? s.description : "";
  }
  put(k: string, v: unknown) {
    this.changed.emit({ ...this.record(), [k]: v });
  }
  toggle([k, s]: [string, unknown]) {
    if (!this.has(k)) this.put(k, initial(s));
    else {
      const next = { ...this.record() };
      delete next[k];
      this.changed.emit(next);
    }
  }
  edit(el: HTMLInputElement) {
    this.changed.emit(
      this.numeric() ? (el.value === "" ? null : el.valueAsNumber) : el.value,
    );
  }
  replace(i: number, v: unknown) {
    this.changed.emit(this.list().map((x, j) => (i === j ? v : x)));
  }
  remove(i: number) {
    this.changed.emit(this.list().filter((_, j) => i !== j));
  }
  add() {
    this.changed.emit([...this.list(), initial(this.definition().items)]);
  }
}
