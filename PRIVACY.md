# Privacy Policy

Effective November 25, 2026. Applies to the Toolpeek browser extension and the website at https://toolpeek.web.app.

Toolpeek runs in your browser. It has no account system, backend, analytics or telemetry, and it does not sell or share your data. Its developers receive no data from the extension.

## What the extension accesses

- **The active tab, when you grant it.** Clicking the Toolpeek toolbar icon gives the extension temporary access to the current tab (Chrome's `activeTab` permission). Toolpeek then runs its own packaged script in that tab's top-level page. It requests no host permissions and cannot read sites you have not opened it on.
- **WebMCP tool definitions.** On that page Toolpeek reads the tools registered through WebMCP (`document.modelContext`): their names, descriptions, input schemas and annotations. It also reads the page's origin (for example `https://example.com`). It does not read the rest of the page's content.
- **Tool runs.** When you run a tool, or approve one the Agent runs, Toolpeek passes the arguments to the website's own tool implementation and shows the result. The website decides what that tool does and may contact its own services.

## What is stored, and where

All storage uses Chrome's extension storage on your device. Toolpeek does not use Chrome Sync.

| Data | Where | How long |
| --- | --- | --- |
| Activity (origins, timestamps, tool names, arguments, results, durations, errors) | Session storage (`chrome.storage.session`) by default | Until Chrome closes, or until you clear it. Limited to the latest 100 entries. |
| Activity, if you turn on **Keep activity after Chrome closes** | Local storage (`chrome.storage.local`) | Until you clear it, turn the setting off, or remove the extension |
| Preferences (theme, activity setting, Agent provider and model) | Local storage | Until you change them or remove the extension |
| AI provider API keys you add in the Agent tab | Local storage | Until you remove the key or the extension |
| Agent conversation | Memory only | Discarded when the side panel closes or you start a new chat |

API keys are stored as entered in the extension's local storage on this device. Toolpeek does not add its own encryption. Anyone with access to your browser profile could read them, so use keys you can revoke, ideally with spending limits.

## What is sent to AI providers

The Agent tab is optional and does nothing until you add an API key. When you use it, Toolpeek sends data directly from your browser to the provider you selected, and to no one else:

| Provider | Endpoint |
| --- | --- |
| Google Gemini | `generativelanguage.googleapis.com` |
| OpenAI | `api.openai.com` |
| Anthropic | `api.anthropic.com` |

Each request contains your API key for that provider, your messages, the website's origin, the website's tool definitions, the conversation so far and the results of tools that ran. Saving a Gemini or OpenAI key also requests the list of models that key can use. The provider processes this data under your agreement with it. Review its terms before sending sensitive information. The extension's Content Security Policy blocks network connections to any other destination.

Without an API key, the extension makes no network requests of its own.

## Exports and clipboard

Exporting tools, activity or audit reports saves a file to the location you choose. Copy buttons put data on your clipboard. These happen only when you ask, and the files or clipboard contents can include sensitive arguments or results. Clearing activity does not delete exported files.

## Your controls

- **Clear activity:** Activity → Clear.
- **Stop keeping activity:** Settings → turn off *Keep activity after Chrome closes*.
- **Remove an API key:** Agent → settings → *Remove key*.
- **Remove everything:** uninstalling the extension deletes all of its stored data.

## Website

https://toolpeek.web.app is a static site served by Firebase Hosting (Google). It uses no cookies, analytics or third-party scripts, and serves its fonts itself. In browsers with WebMCP it registers a few read-only tools that return public information about Toolpeek; they run in your browser and send nothing anywhere. Like any web host, Firebase Hosting may process request data such as IP addresses and user agents to deliver and protect the service.

## Chrome Web Store User Data Policy

The use of information received from Chrome APIs adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), including the Limited Use requirements. Data is used only to provide Toolpeek's single purpose: discovering, inspecting and running a website's WebMCP tools.

## Changes and contact

Changes to this policy are published in this file and on the website, with a new effective date. Ask questions or report problems in [GitHub Issues](https://github.com/hkolos1/toolpeek/issues). Report security issues privately as described in [SECURITY.md](SECURITY.md).
