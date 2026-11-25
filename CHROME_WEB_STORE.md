# Chrome Web Store submission

Status: **not submitted.** Toolpeek is not on the Chrome Web Store. Don't link to a store listing or call it approved until it is live. When it is, put the URL in `website/src/app/site.ts` (`chromeWebStore`) and update the README's Install section.

Requirements checked against the Chrome Web Store docs in November 2026: [images](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements), [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use).

## Package

```sh
npm ci
npm run package        # release/toolpeek-v1.0.0.zip
```

Upload that ZIP. It is built from an allowlist (`scripts/assets.mjs`), so it contains only the manifest, compiled scripts, HTML, CSS, icons, fonts and license files. No source maps, tests or source code. The release workflow attaches the same file, tested in Chrome, to a draft GitHub Release.

## Compliance review

| Area | Status |
| --- | --- |
| Manifest V3 | `manifest_version: 3`, service worker background, `minimum_chrome_version: 116`. |
| Permissions | `activeTab`, `scripting`, `sidePanel`, `storage`. All used; none can be removed without breaking a feature (see justifications). |
| Host permissions | None. Page access comes only from `activeTab` after a toolbar click. |
| Content Security Policy | `script-src 'self'; object-src 'none'; connect-src` limited to the three AI provider APIs; `base-uri 'none'`. |
| Remote code | None. All JavaScript, including Angular and the Anthropic SDK, is bundled. Network responses are data (model replies, model lists) and are never executed. |
| API keys | User-supplied, stored in `chrome.storage.local`, never synced, never logged, sent only to the matching provider. |
| User data | No backend, analytics or telemetry. Data leaves the device only when the user runs the optional Agent, and only to the provider they chose. |
| WebMCP | Uses `document.modelContext` from the isolated content script. Requires a Chrome build with WebMCP (origin trial sites, or the `#enable-webmcp-testing` flag). Without it the extension still works for offline imports and audits, and says why live discovery is unavailable. |

## Store listing

**Name**

```
Toolpeek
```

**Summary** (132 characters max; this is the manifest description)

```
See what AI agents see. Discover, inspect and run the WebMCP tools a website exposes, from Chrome's side panel.
```

**Category:** Developer Tools · **Language:** English

**Description**

```
See what AI agents see.

Websites can register WebMCP tools: typed functions that AI agents call instead of clicking through the page. Toolpeek shows you those tools and lets you work with them from Chrome's side panel.

DISCOVER
• See every WebMCP tool the current page registers, updated live.
• Search by name or description and filter by safety hint: read-only, consequential or destructive.

INSPECT
• Read each tool's parameters, types, annotations and full JSON definition.
• Copy, export or import tool inventories for offline review.

EXECUTE
• Run tools from a generated form or raw JSON, validated against the tool's schema.
• State-changing tools ask for confirmation first.
• See the response, status and duration, and copy the JSON.

AGENT (OPTIONAL)
• Describe a task and Gemini, ChatGPT or Claude calls the page's tools for you, using your own API key.
• Read-only calls run directly. Everything else waits for your approval.

ACTIVITY AND AUDIT
• A local journal of discoveries and tool runs with arguments and responses.
• Audit tool definitions for specification issues and risky metadata, exported as JSON or HTML.

PRIVATE BY DESIGN
• No account, backend, analytics or telemetry.
• No host permissions: access is granted to one tab when you click the toolbar icon.
• Without an API key, Toolpeek makes no network requests.

REQUIREMENTS
Live discovery needs a page that registers WebMCP tools and a Chrome build with WebMCP. For local testing, enable chrome://flags/#enable-webmcp-testing.

Open source (MIT): https://github.com/hkolos1/toolpeek
Website: https://toolpeek.web.app
```

**Feature summary** (for the listing or social posts)

- Live discovery of a page's WebMCP tools
- Parameter summaries and full JSON definitions
- Schema-validated tool runs with confirmation for state-changing tools
- Optional agent: Gemini, ChatGPT or Claude with your own key and per-call approval
- Local activity journal and exportable audit reports
- System, dark and light themes

**Installation instructions** (for the listing's support text or website)

1. Click **Add to Chrome**.
2. Open a page that registers WebMCP tools.
3. Click Toolpeek in the extensions menu, then **Open Side Panel**.

## Graphics

| Asset | File | Spec |
| --- | --- | --- |
| Store icon | `assets/store/icon-128.png` (same as `public/icons/icon-128.png`) | 128×128 PNG, 96×96 artwork with 16px transparent padding |
| Screenshots | `assets/store/screenshot-1-tools.png` … `screenshot-5-audit.png` | 1280×800 PNG, no alpha, 5 of 5 allowed |
| Small promo tile | `assets/store/small-promo-440x280.png` | 440×280 PNG |
| Marquee promo tile | `assets/store/marquee-1400x560.png` | 1400×560 PNG |

Screenshots are real captures of the extension against the bundled demo page (`scripts/screenshots.mjs`), framed by `scripts/promo.mjs`. They contain no API keys or personal data.

## Privacy practices tab

**Single purpose**

```
Toolpeek lets developers discover, inspect and run the WebMCP tools that the current website registers, from Chrome's side panel.
```

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `activeTab` | Grants temporary access to the tab the user is on when they click the toolbar icon, so Toolpeek can read that page's WebMCP tools. No other tabs or sites are accessed. |
| `scripting` | Injects Toolpeek's packaged content script into the active tab (after the activeTab grant) to list WebMCP tools and run the tool the user chooses. |
| `sidePanel` | Shows the Toolpeek workspace in Chrome's side panel next to the page being inspected. |
| `storage` | Saves preferences (theme, activity setting, AI provider and model), the activity journal, and API keys the user enters for the optional Agent. Stored locally; not synced. |

**Host permissions:** none requested.

**Remote code:** No, I am not using remote code.

**Data usage.** Data counts as "collected" when it leaves the device. Toolpeek sends data off the device only when the user runs the optional Agent, and only to the AI provider they configured. Recommended disclosures:

| Data type | Tick? | Why |
| --- | --- | --- |
| Website content | Yes | Tool definitions, the page origin and tool results are sent to the user's chosen AI provider when they use the Agent. |
| Authentication information | Yes | The user's own provider API key is sent to that provider to authenticate requests. |
| Personal communications | Consider | Agent prompts the user types are sent to the provider. Tick it if the reviewer asks you to treat prompts as communications. |
| Everything else (PII, health, financial, location, web history, user activity) | No | Not accessed. Activity history stays on the device. |

Certify all three statements: data is not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used or transferred to determine creditworthiness or for lending.

**Privacy policy URL**

```
https://toolpeek.web.app/privacy
```

The policy includes the required Limited Use statement.

## Publishing steps

1. Register a Chrome Web Store developer account (one-time US$5 fee, paid by the maintainer) and turn on 2-step verification.
2. **Add new item** and upload `release/toolpeek-v1.0.0.zip`.
3. Fill in the listing, graphics and privacy tab from this file. Set the homepage to https://toolpeek.web.app and support to https://github.com/hkolos1/toolpeek/issues.
4. Choose visibility (Public or Unlisted) and the regions, then submit for review. Use deferred publishing if you want to release by hand after approval.
5. After approval, set `chromeWebStore` in `website/src/app/site.ts`, update the README, then run `npm run deploy` in `website/`.

Later versions: bump the version (see README › Releases), run `npm run package` and upload the new ZIP under **Package**.
