# Contributing

Thanks for helping. Bug reports and focused pull requests are welcome.

## Extension

Use Node 22.22+ or 24.15+ and npm. Install locked dependencies with `npm ci`, build with `npm run dev`, load `dist/` at `chrome://extensions`, and run `npm run demo` to inspect the local inventory at http://127.0.0.1:4178. After changing source, rebuild and reload the extension.

Before submitting, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium   # once; use --with-deps on Linux
npm run e2e                       # stop the demo server first
```

CI runs the browser suite with native WebMCP enabled and disabled.

- Keep browser API adaptations in the isolated content-script adapter (`src/extension/adapter.ts`). Link a browser or specification source for API changes.
- Add a regression test when changing the permission boundary, persistence, schema semantics or an audit rule.
- Keep demo data in `demo/` or the tests.
- Follow [BRANDING.md](BRANDING.md) for UI work. If the UI changes visibly, refresh images with `node scripts/screenshots.mjs && node scripts/promo.mjs`.
- Explain how you verified the change and call out browser-dependent behavior in the pull request.

## Website

The landing page lives in `website/` (Angular 22, Tailwind CSS 4). `cd website && npm ci && npm start`. Keep `website/src/app/pages/privacy.html` and `PRIVACY.md` in sync.

## Releases

GitHub Releases is the distribution channel until the Chrome Web Store listing is live. For a release, update the version in `package.json`, `package-lock.json` and `public/manifest.json`, then add `CHANGELOG.md` and `docs/releases/vX.Y.Z.md`. Settings reads the installed version from the manifest.

Commit, tag the commit `vX.Y.Z` and push the branch and tag. The release workflow validates the versions, builds the ZIP, runs the browser suite against its extracted contents and attaches it to a draft release. A maintainer reviews and publishes the draft. Use `TOOLPEEK_CHROME` to test with a specific Chrome for Testing build and `TOOLPEEK_EXTENSION_DIR` to test an extracted ZIP.

Contributions are licensed under the MIT license.
