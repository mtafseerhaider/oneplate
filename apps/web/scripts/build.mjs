/* Builds apps/web/dist from the single-file app: wraps app/index.html in a real document, adds the manifest, the service worker and the API adapter. */
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, "../../.."); const out = path.resolve(here, "../dist");
const body = await readFile(path.join(root, "app/index.html"), "utf8");
const wa = await readFile(path.resolve(here, "../node_modules/@simplewebauthn/browser/dist/bundle/index.umd.min.js"), "utf8").catch(() => "");
const api = process.env.ONEPLATE_API ?? "";
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#C4731A"><link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icon.svg"><link rel="apple-touch-icon" href="./icon.svg"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="OnePlate">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
<script>window.ONEPLATE_API=${JSON.stringify(api)};</script><script src="./webauthn.js"></script><script src="./oneplate-adapter.js"></script></head><body>${body}
<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});</script></body></html>`;
await mkdir(out, { recursive: true }); await cp(path.resolve(here, "../public"), out, { recursive: true }); await writeFile(path.join(out, "index.html"), html); await writeFile(path.join(out, "webauthn.js"), wa || "/* @simplewebauthn/browser not installed */");
console.log(`built ${out} (${(html.length / 1024).toFixed(0)} KB) · API base: ${api || "same origin"}`);
