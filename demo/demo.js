const inventory = new Map([
  ["A1", { name: "Field notebook", price: 8 }],
  ["B2", { name: "Graph pencil", price: 3 }],
]);
const items = document.querySelector("#items"),
  status = document.querySelector("#status"),
  log = document.querySelector("#log"),
  toggle = document.querySelector("#toggle");
function render() {
  items.replaceChildren(
    ...Array.from(inventory, ([id, item]) => {
      const li = document.createElement("li");
      const sku = document.createElement("code");
      const name = document.createElement("span");
      const price = document.createElement("span");
      sku.textContent = id;
      name.textContent = item.name;
      price.textContent = `$${item.price.toFixed(2)}`;
      li.append(sku, name, price);
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
    log.textContent += `${name} registered\n`;
  } catch (e) {
    log.textContent += `${name} rejected · ${String(e)}\n`;
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
