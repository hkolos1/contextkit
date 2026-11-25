const inventory = new Map([
  ["A1", { name: "Field notebook", price: 8 }],
  ["B2", { name: "Graph pencil", price: 3 }],
]);
const items = document.querySelector("#items"),
  status = document.querySelector("#status"),
  log = document.querySelector("#log"),
  toggle = document.querySelector("#toggle");
const art = {
  A1: '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="34" y="12" width="52" height="66" rx="4" fill="#1f3a5f"/><rect x="34" y="12" width="8" height="66" fill="#16304f"/><rect x="50" y="26" width="26" height="6" rx="2" fill="#f5efe3"/><path d="M80 12v30l-5-4-5 4V12" fill="#c2410c"/></svg>',
  B2: '<svg viewBox="0 0 120 90" aria-hidden="true"><g transform="rotate(-32 60 45)"><rect x="18" y="38" width="70" height="14" rx="2" fill="#e8b44a"/><rect x="18" y="38" width="10" height="14" fill="#d4d4d8"/><rect x="12" y="38" width="7" height="14" rx="2" fill="#e88f8f"/><path d="M88 38l16 7-16 7z" fill="#f2d7a6"/><path d="M99 43l5 2-5 2z" fill="#3f3f46"/></g></svg>',
};
const fallback =
  '<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="38" y="22" width="44" height="46" rx="6" fill="#d6d3d1"/><path d="M38 34h44" stroke="#a8a29e" stroke-width="3"/></svg>';
function render() {
  items.replaceChildren(
    ...Array.from(inventory, ([id, item]) => {
      const li = document.createElement("li");
      const figure = document.createElement("div");
      figure.className = "art";
      figure.innerHTML = art[id] ?? fallback;
      const name = document.createElement("h3");
      name.textContent = item.name;
      const meta = document.createElement("p");
      const sku = document.createElement("code");
      sku.textContent = id;
      const price = document.createElement("b");
      price.textContent = `$${Number(item.price).toFixed(2)}`;
      meta.append(sku, price);
      li.append(figure, name, meta);
      return li;
    }),
  );
}
render();
const str = (description) => ({ type: "string", description });
const id = str("Inventory item identifier, for example A1.");
const schema = (properties, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const read = { readOnlyHint: true },
  write = { consequentialHint: true };
function item(key) {
  const found = inventory.get(key);
  if (!found) throw Error("Unknown item ID.");
  return found;
}
const definitions = [
  [
    "search_items",
    "Search inventory items by a case-insensitive name fragment.",
    schema({ query: str("Name fragment to find.") }),
    read,
    ({ query }) =>
      Array.from(inventory.entries()).filter(([, x]) =>
        x.name.toLowerCase().includes(query.toLowerCase()),
      ),
  ],
  [
    "get_item_details",
    "Return the name and unit price for one item.",
    schema({ id }),
    read,
    ({ id }) => item(id),
  ],
  [
    "calculate_total",
    "Calculate the total price for inventory line items.",
    schema(
      {
        lines: {
          type: "array",
          description: "Line items to total.",
          items: schema({
            id,
            quantity: {
              type: "integer",
              minimum: 1,
              description: "Number of units.",
            },
          }),
        },
        currency: {
          type: "string",
          enum: ["USD"],
          description: "Display currency.",
        },
        round: { type: "boolean", description: "Round to the nearest dollar." },
      },
      ["lines"],
    ),
    read,
    ({ lines, round }) => {
      const sum = lines.reduce(
        (n, line) => n + item(line.id).price * line.quantity,
        0,
      );
      return { total: round ? Math.round(sum) : sum };
    },
  ],
  [
    "update_item",
    "Change the display name for an inventory item.",
    schema({ id, name: str("Replacement display name.") }),
    write,
    ({ id, name }) => {
      item(id).name = name;
      render();
      return item(id);
    },
  ],
  [
    "delete_item",
    "Delete one item from the local inventory.",
    schema({ id }),
    write,
    ({ id }) => {
      item(id);
      inventory.delete(id);
      render();
      return { deleted: id };
    },
  ],
  [
    "invalid_schema",
    "Exercise schema auditing on a malformed property.",
    schema({ value: { type: "unknown-type" } }),
    {},
    () => null,
  ],
  [
    "execution_error",
    "Exercise error reporting with a deliberate failure.",
    schema({}),
    {},
    () => {
      throw Error("Demo execution error");
    },
  ],
];
const api = document.modelContext;
/** One line per tool in the "Agent tools" panel, updated in place. */
function row(name, annotations = {}, state, detail = "") {
  let li = log.querySelector(`[data-tool="${name}"]`);
  if (!li) {
    li = document.createElement("li");
    li.dataset.tool = name;
    log.append(li);
  }
  const kind = annotations.readOnlyHint
    ? "read-only"
    : annotations.destructiveHint
      ? "destructive"
      : annotations.consequentialHint
        ? "writes"
        : "unclassified";
  const code = document.createElement("code");
  code.textContent = name;
  const tag = document.createElement("span");
  tag.className = `tag ${kind}`;
  tag.textContent = kind;
  const status = document.createElement("small");
  status.textContent = detail ? `${state} · ${detail}` : state;
  li.dataset.state = state;
  li.replaceChildren(code, tag, status);
}
let controller;
async function register(
  [name, description, inputSchema, annotations, execute],
  options,
) {
  try {
    await api.registerTool(
      {
        name,
        description,
        inputSchema,
        annotations,
        execute: async (args) => JSON.stringify(await execute(args)),
      },
      options,
    );
    row(name, annotations, "registered");
    options?.signal?.addEventListener("abort", () => row(name, annotations, "removed"));
  } catch (e) {
    row(name, annotations, "rejected", String(e));
  }
}
if (typeof api?.registerTool === "function") {
  for (const def of definitions) {
    if (def[0] === "execution_error") controller = new AbortController();
    await register(def, controller ? { signal: controller.signal } : undefined);
  }
  status.textContent = `${definitions.length} tools registered`;
  status.dataset.ok = "";
  toggle.disabled = false;
  toggle.onclick = async () => {
    if (controller) {
      controller.abort();
      controller = null;
      toggle.textContent = "Register error tool";
    } else {
      controller = new AbortController();
      await register(definitions.at(-1), { signal: controller.signal });
      toggle.textContent = "Remove error tool";
    }
  };
} else
  status.textContent =
    "WebMCP unavailable. Enable the Chrome testing flag and relaunch.";
