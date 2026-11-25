# Contributing

Use Node 24 LTS (24.15 or later) and npm. Install locked dependencies with `npm ci`. Build with `npm run dev`, load `dist/` at `chrome://extensions`, and run `npm run demo` to inspect the local inventory. After changing source, rebuild and reload the extension.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install chromium`, and `npm run e2e` before submitting. CI uses Chromium with native WebMCP enabled and disabled. Install browser dependencies with `npx playwright install --with-deps chromium` on Linux.

Keep browser API adaptations in the isolated content-script adapter. Link a primary browser or specification source for API changes. Add a regression test when changing the permission boundary, persistence behavior, schema semantics or an audit classification. Keep demo data in the demo or tests. Explain how you verified a change and call out browser-dependent behavior in the pull request.

Contributions are licensed under the MIT license.

## Releases

The public distribution channel is [GitHub Releases](https://github.com/hkolos1/toolpeek/releases). For a release, update the npm version and lockfile, the manifest version, the changelog and the matching notes in `docs/releases/vX.Y.Z.md`. Settings reads the installed version directly from the manifest.

Run `npm run package` to create `release/toolpeek-vX.Y.Z.zip`. Commit the release changes, tag that commit with the matching `vX.Y.Z` tag and push the branch and tag. The release workflow validates versions, builds the production ZIP, runs the browser suite against its extracted contents and publishes the tested asset. Use `TOOLPEEK_CHROME` to test with a particular Chrome for Testing executable, and `TOOLPEEK_EXTENSION_DIR` to test an extracted release locally.
