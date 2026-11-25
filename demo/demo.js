const inventory = new Map([
  ["A1", { name: "Field notebook", price: 8 }],
  ["B2", { name: "Graph pencil", price: 3 }],
  ["C3", { name: "Brass sharpener", price: 12 }],
]);
const items = document.querySelector("#items"),
  status = document.querySelector("#status"),
  log = document.querySelector("#log"),
  toggle = document.querySelector("#toggle"),
  cartButton = document.querySelector("#cart"),
  receipt = document.querySelector("#receipt");
const cart = new Map();
const money = (n) => `$${Number(n).toFixed(2)}`;
const cartTotal = () =>
  Array.from(cart, ([id, q]) => (inventory.get(id)?.price ?? 0) * q).reduce((a, b) => a + b, 0);
/** Restarts a CSS animation class on an element. */
function flash(el, name) {
  el?.classList.remove(name);
  void el?.offsetWidth;
  el?.classList.add(name);
}
function renderCart() {
  const count = Array.from(cart.values()).reduce((a, b) => a + b, 0);
  cartButton.querySelector("b").textContent = count;
  cartButton.querySelector("small").textContent = money(cartTotal());
  if (count) cartButton.dataset.full = "";
  else delete cartButton.dataset.full;
  flash(cartButton, "bump");
}
const defs = (id, a, b) =>
  `<defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
const art = {
  A1: `<svg viewBox="0 0 120 90" aria-hidden="true">${defs("a1", "#2563eb", "#22d3ee")}<rect x="36" y="10" width="50" height="70" rx="5" fill="url(#a1)"/><rect x="36" y="10" width="9" height="70" rx="3" fill="#0b1220" opacity=".35"/><rect x="52" y="26" width="24" height="5" rx="2.5" fill="#e0f2fe" opacity=".9"/><rect x="52" y="35" width="16" height="3" rx="1.5" fill="#e0f2fe" opacity=".5"/><path d="M78 10v28l-5-4-5 4V10" fill="#34d399"/></svg>`,
  B2: `<svg viewBox="0 0 120 90" aria-hidden="true">${defs("b2", "#34d399", "#22d3ee")}<g transform="rotate(-30 60 45)"><rect x="16" y="38" width="72" height="14" rx="3" fill="url(#b2)"/><rect x="16" y="38" width="9" height="14" fill="#94a3b8"/><rect x="10" y="38" width="7" height="14" rx="3" fill="#f472b6"/><path d="M88 38l17 7-17 7z" fill="#e2e8f0"/><path d="M100 43l5 2-5 2z" fill="#0f172a"/></g></svg>`,
  C3: `<svg viewBox="0 0 120 90" aria-hidden="true">${defs("c3", "#22d3ee", "#3b82f6")}<rect x="40" y="26" width="40" height="38" rx="8" fill="url(#c3)"/><circle cx="60" cy="45" r="9" fill="#0b1220" opacity=".55"/><circle cx="60" cy="45" r="4" fill="#e0f2fe"/><rect x="80" y="38" width="10" height="14" rx="3" fill="#94a3b8"/></svg>`,
};
const fallback = `<svg viewBox="0 0 120 90" aria-hidden="true">${defs("x", "#1e293b", "#334155")}<rect x="38" y="22" width="44" height="46" rx="8" fill="url(#x)"/></svg>`;
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
      li.dataset.id = id;
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
    "add_to_cart",
    "Add a quantity of one inventory item to the shopping cart.",
    schema({
      id,
      quantity: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Number of units to add.",
      },
    }),
    write,
    ({ id, quantity }) => {
      item(id);
      cart.set(id, (cart.get(id) ?? 0) + quantity);
      renderCart();
      const card = items.querySelector(`[data-id="${id}"]`);
      card?.style.setProperty("--added", `"+${quantity}"`);
      flash(card, "added");
      return { cart: Object.fromEntries(cart), total: cartTotal() };
    },
  ],
  [
    "checkout",
    "Pay for everything in the cart and place the order.",
    schema({
      payment: {
        type: "string",
        enum: ["card", "invoice"],
        description: "Payment method for the order.",
      },
    }),
    write,
    ({ payment }) => {
      if (!cart.size) throw Error("The cart is empty.");
      const order = {
        order: `PG-${1040 + Math.floor(Math.random() * 60)}`,
        payment,
        items: Array.from(cart, ([id, quantity]) => ({ id, name: item(id).name, quantity })),
        total: cartTotal(),
      };
      receipt.querySelector("[data-order]").textContent = order.order;
      receipt.querySelector("[data-total]").textContent = money(order.total);
      receipt.querySelector("[data-lines]").replaceChildren(
        ...order.items.map((l) => {
          const li = document.createElement("li");
          li.textContent = `${l.quantity} × ${l.name}`;
          return li;
        }),
      );
      cart.clear();
      renderCart();
      receipt.hidden = false;
      flash(receipt, "show");
      return order;
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
