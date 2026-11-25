# Privacy

Toolpeek runs on your device. It has no accounts, analytics, telemetry, remote scripts or backend. AI providers are contacted only by the optional Agent tab, described below. Clicking its Chrome action grants temporary access to the active website. Discovery reads tool metadata for its top-level document. Running a tool passes the arguments to that website. The website controls its own implementation and may contact its services.

Activity includes website origins, timestamps, tool names, arguments and results. It stays in browser session memory by default. Settings lets you opt into disk storage and turn it off again. Disabling persistence moves retained history back to session memory. Clear under Activity deletes retained entries. Theme and the persistence preference are local settings. Toolpeek does not use Chrome Sync.

Exports save data to your chosen download destination. Clipboard actions occur on request. Export files and clipboard contents can contain secrets from tool arguments or responses. Clearing Activity does not remove files or clipboard data. Importing a definition opens it in the current UI for offline inspection.

## Agent tab (optional)

The Agent tab stays inactive until you save an API key for one of its providers: Google Gemini, OpenAI or Anthropic. Keys are kept in this browser's extension storage (`chrome.storage.local`), are not synced, and each key is sent only to its provider (`generativelanguage.googleapis.com`, `api.openai.com` or `api.anthropic.com`). The extension's Content Security Policy allows no other network destinations. When you send a message, Toolpeek sends your prompt, the website origin, the website's tool definitions, the conversation so far and the results of tools it ran to the selected provider, which processes them under the terms of your account with that provider. Saving a Gemini or OpenAI key also lists the models it can use. Tool calls the agent makes run through the same guarded path as the Playground and appear in Activity. Remove a key in the Agent settings to stop requests to that provider. The conversation itself is held in memory and is discarded when the side panel closes or you start a new chat.

Releases are downloaded manually from GitHub. The installed extension makes no automatic update checks or requests to GitHub.
