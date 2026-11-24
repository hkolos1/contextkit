# ContextKit

A local WebMCP developer toolkit for desktop Chrome. Open the side panel next to a website, inspect its registered tools, supply arguments and see what each invocation returns. The extension requires no account, server or API key.

<img src="docs/explorer.png" alt="ContextKit side panel showing native tools from the local inventory demo" width="360"> <img src="docs/popup.png" alt="ContextKit popup with the active origin, audit counts and tool preview" width="300">

Development previews captured from the built extension against the included native WebMCP demo.

## Install in Chrome

1. Extract the release ZIP into a permanent directory, or build the repository with `npm ci && npm run build` using Node 24.15 or later in the 24.x series.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked**. Select the extracted directory containing `manifest.json`, or the build's **dist** directory.
4. For local WebMCP testing, open `chrome://flags/#enable-webmcp-testing`, choose **Enabled**, and relaunch Chrome.
5. Visit a WebMCP-enabled HTTPS page or the loopback demo. Click **ContextKit** in the extensions menu or toolbar, then **Open Side Panel**. Invoke the toolbar action again when switching to a new tab or origin that needs access.

The manifest requires desktop Chrome 116+ for opening a side panel from a user gesture. Live inspection additionally requires a Chrome build that exposes the experimental discovery API in an isolated content script. Native workflows were tested with Chrome for Testing 159.0.8154.6. Chrome documents a site origin trial starting in 149; site registration and extension-side discovery have separate availability. ContextKit checks the methods at runtime. Offline inspection works independently of the page API. Firefox, Safari and mobile browsers are outside the supported extension targets. [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) · [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

## Workspace

| View | Capabilities |
| --- | --- |
| Popup | Active origin, compatibility, inventory and audit counts, first three tools, refresh and side-panel launch |
| Tools | Search names and descriptions, filter by safety classification, expand definitions, copy JSON, export or import an inventory |
| Playground | Recursive schema forms or raw JSON, client-side validation, explicit invocation, confirmation, timing, timestamps and request/response copying |
| Activity | Discovery snapshots and ContextKit invocations across inspected sites, status filtering, expanded payloads, clearing and JSON export |
| Audit | Deterministic checks with category, severity, tool and remediation. Export JSON or a standalone HTML report |

**Native browser operations.** The adapter calls `document.modelContext.getTools()`, retains top-level tool handles, and passes a native handle and argument object to `executeTool()`. An available `toolchange` event refreshes discovery while an inspector is open. The adapter recognizes the source window fields used across Chromium implementations. [WebMCP specification](https://webmachinelearning.github.io/webmcp/) · [Chrome reference content script](https://github.com/GoogleChromeLabs/webmcp-extension/blob/main/extension/content.ts)

**ContextKit operations.** Search, forms, validation, confirmation, audit findings, history and exports are local extension features. A consequential hint or an imported destructive hint takes precedence over a read-only hint. Unclassified tools also require confirmation. A website supplies its own safety hints. Audit heuristics flag text for review and do not establish a vulnerability.

**Offline inspection.** Use the upload button in Tools to import either a tool array or a ContextKit `{ "version": 1, "tools": [...] }` export. Open a definition in Playground to test arguments locally. **Return to active tab** reconnects the inspector.

## Local demo

Run `npm run demo` from the repository root. Open [the inventory lab](http://127.0.0.1:4178) in Chrome. All inventory changes live in the demo tab's memory.

- Run `get_item_details` with `{"id":"A1"}` to retrieve the field notebook.
- Run `calculate_total` with `{"lines":[{"id":"A1","quantity":3}]}` to get a total of 24. Its form includes nested objects, arrays, numeric fields, an optional enum and a boolean.
- Try `search_items`, `update_item` and `delete_item`. Cancel a consequential invocation to keep the inventory intact.
- Inspect `invalid_schema`, which attempts to register an unknown property type. A browser that rejects the registration records the reason in the demo's registration log. Run `execution_error` to see a rejected invocation. Remove or re-register that tool to inspect discovery changes.
- Follow **Open empty inventory** to check document navigation and an empty registry.

## Implementation

| Source | Responsibility |
| --- | --- |
| `src/ui/` | Angular 22.3 standalone components, signals, computed state, zoneless bootstrap, popup, panel, recursive fields, theme tokens and export writer |
| `src/extension/background.ts` | MV3 service worker, trusted UI message routing and discovery journal |
| `src/extension/target.ts`, `execution.ts` | Active window/tab selection, document-scoped transport and timed execution |
| `src/extension/content.ts`, `adapter.ts` | On-demand isolated content script, native feature detection, registration observation and invocation |
| `src/core/` | Discriminated message types, input bounds, schema checks, classification and deterministic audit rules |
| `src/extension/storage.ts` | Serialized session history updates and opt-in migration to local storage |
| `public/`, `scripts/` | MV3 manifest, original logo, PNG icons, Angular AOT build, local Tailwind/Lucide assets and ZIP packaging |

Chrome supplies the temporary `activeTab` grant. ContextKit requests `scripting`, `sidePanel` and `storage` and declares no host permissions. The extension does not install content scripts globally. [Chrome extension documentation](https://developer.chrome.com/docs/extensions) · [Active tab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)

## Validation and limits

- The local schema validator supports single JSON types, object properties and required fields, additional properties, homogeneous arrays, enums, constants, numeric bounds, string lengths and item counts. Unimplemented keywords, including references, patterns and schema composition, produce a diagnostic and block execution. Imports remain inspectable. No remote schema resolution or runtime code generation runs.
- Audit separates WebMCP registration and JSON Schema errors from authoring recommendations and heuristics. Duplicate names can only be reported when both appear in the inventory. A rejected registration may be visible only to the page that attempted it.
- Discovery and invocation cover the active top-level document. Cross-frame and cross-document result collection are outside this release. Live registration style is shown as unavailable when the native descriptor omits it. Explicit registration style in an imported inventory is preserved.
- Activity records observed inventory changes and ContextKit runs while inspecting a document. Chrome DevTools has a separate invocation view. ContextKit has no access to its historical events. [Chrome DevTools WebMCP pane](https://developer.chrome.com/docs/devtools/application/webmcp)
- Imports are limited to 1 MB on disk and 150 tools. Runtime guards also limit serialized length, depth and node count. The journal retains at most 100 entries and approximately 400,000 serialized characters. Execution arguments and results are limited to 48,000 serialized characters. A 25-second response deadline ends local waiting; the website may finish later.
- History defaults to `chrome.storage.session`. Settings can keep activity locally across restarts. Exports include the selected data in readable form. [Privacy](PRIVACY.md)

## Development and verification

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run e2e
npm run package
```

`npm run dev` produces a one-shot development build with source maps. Reload the unpacked extension after rebuilding. `npm run package` produces `release/contextkit-1.0.0.zip` with the manifest at its root. Build output and release archives are generated locally and by CI.

Vitest covers the native adapter boundary, schema and audit rules, message trust checks and storage. Playwright uses temporary browser profiles and the release manifest. It triggers the Chrome toolbar action to grant real active-tab access, exercises the native demo with WebMCP enabled, and separately runs with the feature disabled. The extension documents are driven through Playwright, including a check that Chrome opens a real side-panel context. Generate documentation previews with `CONTEXTKIT_PREVIEWS=1 npm run e2e`.

For manual verification, load the extension in your target Chrome channel, resize the docked side panel from 320 to 600 px, test keyboard focus and system theme changes, and inspect any origin-trial or declarative tools specific to your website. The experimental API can vary by channel and platform. [ChromeLabs WebMCP tools and demos](https://github.com/GoogleChromeLabs/webmcp-tools) · [WebMCP proposal repository](https://github.com/webmachinelearning/webmcp)

## Contributing

Use focused changes, include a regression test for behavioral fixes and run the local checks before opening a pull request. [Contribution guide](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE) · [Store listing copy](docs/store-listing.md)
