# Security

Report suspected security issues privately through [GitHub private vulnerability reporting](https://github.com/hkolos1/toolpeek/security/advisories/new), not in public issues. Include the Toolpeek version, Chrome build, operating system, affected entry point and a sanitized description. Omit real activity logs, credentials and private site data.

## Trust boundaries

Toolpeek injects a packaged isolated-world script into frame zero using a Chrome action grant. The background worker accepts UI commands only from its own popup and panel URLs. Invocations bind to a tab, origin and Chrome document ID, re-read the native handle and metadata, validate arguments, and check confirmation. Toolpeek requests no host permissions. Page scripts have no external messaging endpoint.

Definitions, inputs, results and journal retention have size limits. Templates interpolate page data as text. The standalone audit writer creates text nodes and includes a restrictive content security policy. Tool annotations are author-supplied hints. A read-only claim cannot enforce the behavior of the site's implementation.

A page navigation, a transport failure, an oversized response or a timeout may interrupt result collection after a site action has taken effect. Inspect the website before retrying a consequential operation. Toolpeek never retries execution automatically.

## Release provenance

Install from the Chrome Web Store once listed, or the versioned extension ZIP attached to an official [Toolpeek release](https://github.com/hkolos1/toolpeek/releases). The tag identifies the source commit. The published asset’s SHA-256 digest is available in GitHub's release metadata. Extensions installed with **Load unpacked** require manual updates.

## API keys

Agent API keys are stored unencrypted in the extension's local storage, are never logged or included in exports, and are sent only to their provider. Use revocable keys with spending limits.
