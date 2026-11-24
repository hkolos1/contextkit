import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { transformAsync } from "@babel/core";
import linker from "@angular/compiler-cli/linker/babel";
import { build } from "esbuild";
const dev = process.argv.includes("--dev");
await rm(".build", { recursive: true, force: true });
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
execFileSync("node_modules/.bin/ngc", [], { stdio: "inherit" });
const options = {
  plugins: [
    {
      name: "angular-linker",
      setup(build) {
        build.onLoad({ filter: /node_modules.*\.mjs$/ }, async ({ path }) => {
          const source = await readFile(path, "utf8");
          if (!source.includes("ɵɵngDeclare")) return;
          const result = await transformAsync(source, {
            filename: path,
            compact: false,
            plugins: [linker],
            babelrc: false,
            configFile: false,
          });
          return { contents: result.code, loader: "js" };
        });
      },
    },
  ],
  bundle: true,
  target: "chrome116",
  minify: !dev,
  sourcemap: dev,
  legalComments: "eof",
  define: { ngDevMode: String(dev), ngJitMode: "false" },
};
await Promise.all(
  ["ui/main", "extension/background", "extension/content"].map((entry) =>
    build({
      ...options,
      entryPoints: [`.build/${entry}.js`],
      outfile: `dist/${entry.split("/")[1]}.js`,
    }),
  ),
);
execFileSync(
  "node_modules/.bin/tailwindcss",
  ["-i", "src/ui/styles.css", "-o", "dist/style.css", "--minify"],
  { stdio: "inherit" },
);
await mkdir("dist/icons", { recursive: true });
for (const icon of [
  "wrench",
  "play",
  "activity",
  "shield-check",
  "settings-2",
  "refresh-cw",
  "globe",
  "search",
  "panel-right-open",
  "layers",
  "chevron-right",
  "download",
  "upload",
  "terminal",
  "copy",
  "circle-help",
]) {
  await cp(
    `node_modules/lucide-static/icons/${icon}.svg`,
    `dist/icons/${icon}.svg`,
  );
}
await cp("node_modules/lucide-static/LICENSE", "dist/icons/LUCIDE-LICENSE");
for (const name of ["popup", "panel"])
  await writeFile(
    `dist/${name}.html`,
    (await readFile("src/ui/index.html", "utf8")).replace("WORKSPACE", name),
  );

await cp("LICENSE", "dist/LICENSE");
await mkdir("dist/licenses", { recursive: true });
for (const [name, file] of [
  ["@angular/core", "LICENSE"],
  ["rxjs", "LICENSE.txt"],
  ["tslib", "LICENSE.txt"],
  ["tailwindcss", "LICENSE"],
]) {
  await cp(
    `node_modules/${name}/${file}`,
    `dist/licenses/${name.split("/").at(-1)}.txt`,
  );
}
