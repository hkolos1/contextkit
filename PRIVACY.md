# Privacy

ContextKit runs on your device. It has no accounts, analytics, telemetry, remote scripts, AI services or backend. Clicking its Chrome action grants temporary access to the active website. Discovery reads tool metadata for its top-level document. Running a tool passes the arguments to that website. The website controls its own implementation and may contact its services.

Activity includes website origins, timestamps, tool names, arguments and results. It stays in browser session memory by default. Settings lets you opt into disk storage and turn it off again. Disabling persistence moves retained history back to session memory. Clear under Activity deletes retained entries. Theme and the persistence preference are local settings. ContextKit does not use Chrome Sync.

Exports save data to your chosen download destination. Clipboard actions occur on request. Export files and clipboard contents can contain secrets from tool arguments or responses. Clearing Activity does not remove files or clipboard data. Importing a definition opens it in the current UI for offline inspection.
