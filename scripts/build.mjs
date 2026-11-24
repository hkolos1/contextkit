import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { transformAsync } from "@babel/core";
import linker from "@angular/compiler-cli/linker/babel";
import { build } from "esbuild";
import { dirname } from "node:path";
import { staticAssets } from "./assets.mjs";
const dev = process.argv.includes("--dev");
await rm(".build", { recursive: true, force: true });
await rm("dist", { recursive: true, force: true });
for (const [dest, source] of staticAssets) {
  await mkdir(dirname(`dist/${dest}`), { recursive: true });
  await cp(source, `dist/${dest}`);
}
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
for (const name of ["popup", "panel"])
  await writeFile(
    `dist/${name}.html`,
    (await readFile("src/ui/index.html", "utf8")).replace("WORKSPACE", name),
  );
