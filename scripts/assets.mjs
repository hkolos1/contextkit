// Only these static resources ship alongside the compiled extension entry points.
const icons = [
  "activity",
  "bot",
  "download",
  "globe",
  "panel-right-open",
  "play",
  "refresh-cw",
  "search",
  "send",
  "settings-2",
  "shield-check",
  "square",
  "square-pen",
  "terminal",
  "upload",
  "wrench",
];
export const staticAssets = new Map([
  ["manifest.json", "public/manifest.json"],
  ["LICENSE", "LICENSE"],
  ["icons/logo.svg", "public/icons/logo.svg"],
  ...[16, 32, 48, 128].map((size) => [
    `icons/icon-${size}.png`,
    `public/icons/icon-${size}.png`,
  ]),
  ...icons.map((name) => [
    `icons/${name}.svg`,
    `node_modules/lucide-static/icons/${name}.svg`,
  ]),
  ["icons/LUCIDE-LICENSE", "node_modules/lucide-static/LICENSE"],
  ["licenses/angular.txt", "node_modules/@angular/core/LICENSE"],
  ["licenses/rxjs.txt", "node_modules/rxjs/LICENSE.txt"],
  ["licenses/tslib.txt", "node_modules/tslib/LICENSE.txt"],
  ["licenses/tailwindcss.txt", "node_modules/tailwindcss/LICENSE"],
  ["licenses/anthropic-sdk.txt", "node_modules/@anthropic-ai/sdk/LICENSE"],
]);
export const releaseFiles = [
  ...staticAssets.keys(),
  "popup.html",
  "panel.html",
  "main.js",
  "content.js",
  "background.js",
  "style.css",
].sort();
