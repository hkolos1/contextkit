# Changelog

## [v0.2.0](https://github.com/hkolos1/contextkit/releases/tag/v0.2.0) · 2026-11-25

- Added an Agent tab that drives a page's WebMCP tools with Gemini (default), ChatGPT or Claude using your own API key, with per-call approval for state-changing tools.
- Tool runs started by the agent may wait up to five minutes for tools that need the user's action in the page.
- The extension's Content Security Policy now allows connections to the Gemini, OpenAI and Anthropic APIs only, used solely by the Agent tab after you add a key.

## [v0.1.0](https://github.com/hkolos1/contextkit/releases/tag/v0.1.0) · 2026-11-24

First public release. The GitHub Release includes the unpacked Chrome extension as a versioned ZIP.

- Added active-tab WebMCP discovery, guarded manual execution, schema forms and raw JSON editing.
- Added deterministic audits, local activity history, offline imports and JSON and HTML exports.
- Added a native inventory demo and automated extension tests, including checks for unavailable APIs and stale documents.
