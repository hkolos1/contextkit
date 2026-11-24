# Contributing

Use Node 24 LTS (24.15 or later) and npm. Install locked dependencies with `npm ci`. Build with `npm run dev`, load `dist/` at `chrome://extensions`, and run `npm run demo` to inspect the local inventory. After changing source, rebuild and reload the extension.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install chromium`, and `npm run e2e` before submitting. CI uses Chromium with native WebMCP enabled and disabled. Install browser dependencies with `npx playwright install --with-deps chromium` on Linux.

Keep browser API adaptations in the isolated content-script adapter. Link a primary browser or specification source for API changes. Add a regression test when changing the permission boundary, persistence behavior, schema semantics or an audit classification. Keep demo data in the demo or tests. Explain how you verified a change and call out browser-dependent behavior in the pull request.

Contributions are licensed under the MIT license.
