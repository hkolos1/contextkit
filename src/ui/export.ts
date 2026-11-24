import { pretty } from "../core/model";
import type { Finding } from "../core/audit";
export function download(name: string, data: unknown, html = false) {
  const url = URL.createObjectURL(
    new Blob([html ? String(data) : pretty(data)], {
      type: html ? "text/html" : "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `contextkit-${name}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function report(origin: string, findings: Finding[]) {
  const doc = document.implementation.createHTMLDocument("ContextKit audit");
  const add = (tag: string, text: string) => {
    const el = doc.createElement(tag);
    el.textContent = text;
    doc.body.append(el);
  };
  const charset = doc.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  doc.head.prepend(charset);
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "default-src 'none'; style-src 'unsafe-inline'";
  doc.head.append(policy);
  const style = doc.createElement("style");
  style.textContent =
    "body{max-width:58rem;margin:3rem auto;padding:1rem;font:16px/1.6 system-ui;color:#182030}h2{margin-top:2rem;border-top:1px solid #ccd2df;padding-top:1rem;font-size:18px}p{overflow-wrap:anywhere}";
  doc.head.append(style);
  add("h1", "ContextKit · WebMCP audit");
  add(
    "p",
    `${origin} · ${new Date().toISOString()} · ${findings.length} findings`,
  );
  for (const f of findings) {
    add("h2", `${f.tool} · ${f.severity} · ${f.category}`);
    add("p", f.explanation);
    add("p", f.remediation);
  }
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}
