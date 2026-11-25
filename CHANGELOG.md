# Changelog

## [v1.0.0](https://github.com/hkolos1/toolpeek/releases/tag/v1.0.0) · 2026-11-25

ContextKit is now **Toolpeek**.

- Renamed the project, extension, package and repository to Toolpeek, with a new logo, icons and design system. Stored settings, history and API keys are unchanged.
- Redesigned the side panel and popup: new dark and light palettes, Geist typography and a segmented theme control (System remains the default and follows the OS).
- Tool details now summarize parameters before the raw JSON definition.
- Responses show a success or error badge, duration and an icon copy action.
- Added keyboard shortcuts: `/` focuses tool search, Ctrl/⌘+Enter runs the selected tool.
- Added a show/hide toggle for API keys, self-dismissing copy notices and clearer guidance when a page has no WebMCP tools.
- Added the landing page at https://toolpeek.web.app with a privacy policy, plus BRANDING.md and CHROME_WEB_STORE.md.
- Release automation now creates draft GitHub Releases; a website workflow builds and validates the site.

## [v0.2.0](https://github.com/hkolos1/toolpeek/releases/tag/v0.2.0) · 2026-11-25

- Added an Agent tab that drives a page's WebMCP tools with Gemini (default), ChatGPT or Claude using your own API key, with per-call approval for state-changing tools.
- Tool runs started by the agent may wait up to five minutes for tools that need the user's action in the page.
- The extension's Content Security Policy now allows connections to the Gemini, OpenAI and Anthropic APIs only, used solely by the Agent tab after you add a key.

## [v0.1.0](https://github.com/hkolos1/toolpeek/releases/tag/v0.1.0) · 2026-11-24

First public release. The GitHub Release includes the unpacked Chrome extension as a versioned ZIP.

- Added active-tab WebMCP discovery, guarded manual execution, schema forms and raw JSON editing.
- Added deterministic audits, local activity history, offline imports and JSON and HTML exports.
- Added a native inventory demo and automated extension tests, including checks for unavailable APIs and stale documents.
