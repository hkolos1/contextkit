import { mkdir, readFile, writeFile } from "node:fs/promises";
import { zipSync } from "fflate";
import { releaseFiles } from "./assets.mjs";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
const tag = `v${version}`;
if (
  manifest.version !== version ||
  (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== tag)
) {
  throw Error(`Package, manifest and release tag must agree on ${tag}.`);
}

const files = {};
for (const file of releaseFiles) files[file] = await readFile(`dist/${file}`);
const archive = `release/toolpeek-${tag}.zip`;
await mkdir("release", { recursive: true });
await writeFile(
  archive,
  zipSync(files, { level: 9, mtime: new Date(2020, 0, 1) }),
);
console.log(`Packaged ${releaseFiles.length} files in ${archive}`);
