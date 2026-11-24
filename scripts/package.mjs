import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { relative, join, sep } from "node:path";
import { zipSync } from "fflate";
const files = {};
for (const path of (
  await readdir("dist", { recursive: true, withFileTypes: true })
).filter((p) => p.isFile())) {
  const name = join(path.parentPath, path.name);
  files[relative("dist", name).split(sep).join("/")] = await readFile(name);
}
await mkdir("release", { recursive: true });
await writeFile("release/contextkit-1.0.0.zip", zipSync(files));
