# Security

Report suspected security issues privately to the repository maintainer. Use the repository's private vulnerability reporting channel when enabled. Include the ContextKit version, Chrome build, operating system, affected entry point and a sanitized description. Omit real activity logs, credentials and private site data.

## Trust boundaries

ContextKit injects a packaged isolated-world script into frame zero using a Chrome action grant. The background worker accepts UI commands only from its own popup and panel URLs. Invocations bind to a tab, origin and Chrome document ID, re-read the native handle and metadata, validate arguments, and check confirmation. ContextKit requests no host permissions. Page scripts have no external messaging endpoint.

Definitions, inputs, results and journal retention have size limits. Templates interpolate page data as text. The standalone audit writer creates text nodes and includes a restrictive content security policy. Tool annotations are author-supplied hints. A read-only claim cannot enforce the behavior of the site's implementation.

A page navigation, a transport failure, an oversized response or a timeout may interrupt result collection after a site action has taken effect. Inspect the website before retrying a consequential operation. ContextKit never retries execution automatically.
