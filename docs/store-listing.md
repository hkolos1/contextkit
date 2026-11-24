# Chrome Web Store listing

**Name**  
ContextKit

**Short description**  
Inspect, test and audit WebMCP tools on the active website from a local Chrome side panel.

**Description**  
Explore the tools a website exposes through WebMCP. Inspect names, descriptions, schemas and safety hints. Build a request with a generated form or raw JSON, review the arguments, and run it yourself. See results, errors, timestamps and duration in one workspace.

Inspect specification issues, authoring recommendations and heuristic findings. Export tool inventories and audit reports, or import a saved inventory for offline inspection. Local activity history is temporary by default.

Native discovery and execution require a compatible desktop Chrome build and WebMCP access. For local testing, enable the WebMCP testing flag. No account, API key or subscription is required.

**Category**  
Developer Tools

**Single purpose**  
Help developers inspect and test the WebMCP tools exposed by the website they select.

**Permission justification**

- `activeTab` grants temporary access when the user clicks the extension.
- `scripting` installs the packaged isolated inspector in the active top-level document.
- `sidePanel` opens the inspection workspace next to the website.
- `storage` keeps session activity and local preferences, including optional persistent activity.
