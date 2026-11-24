import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const files = new Map([
  ["/", "index.html"],
  ["/demo.js", "demo.js"],
  ["/empty.html", "empty.html"],
]);
createServer(async (req, res) => {
  const file = files.get(req.url);
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  try {
    res.writeHead(200, {
      "Content-Type": file.endsWith(".js")
        ? "text/javascript"
        : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(await readFile(new URL(`../demo/${file}`, import.meta.url)));
  } catch {
    res.end();
  }
}).listen(4178, "127.0.0.1", () =>
  console.log("Inventory lab at http://127.0.0.1:4178"),
);
