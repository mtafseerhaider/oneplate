/* Assembles app/index.html (the artifact build) from apps/web/src: head.html + styles.css + markup.html + the esbuild bundle of lib.js (core + content) + ordered js chunks.
   Run: node scripts/build-app.mjs            (writes app/index.html)
        node scripts/build-app.mjs --check    (fails if app/index.html differs from the sources) */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path"; import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const src = path.join(root, "apps/web/src");
const order = JSON.parse(await readFile(path.join(src, "build-order.json"), "utf8"));
const head = await readFile(path.join(src, "head.html"), "utf8"), css = await readFile(path.join(src, "styles.css"), "utf8"), markup = await readFile(path.join(src, "markup.html"), "utf8");
const lib = await build({ entryPoints: [path.join(src, "lib.js")], bundle: true, format: "iife", write: false, target: "es2020", minify: true, legalComments: "none", absWorkingDir: root });
let js = "/* --- @oneplate/core + @oneplate/content (bundled) --- */\n" + lib.outputFiles[0].text; for (const f of order.js) js += await readFile(path.join(src, "js", f), "utf8");
const html = head + "<style>\n" + css + "</style>\n" + markup + "<script>\n" + js + "</script>" + (order.tail ? "\n" + order.tail : "\n");
const out = path.join(root, "app/index.html");
if (process.argv.includes("--check")) { const cur = await readFile(out, "utf8"); if (cur !== html) { console.error("app/index.html is out of date: run node scripts/build-app.mjs"); process.exit(1); } console.log("app/index.html matches sources"); }
else { await writeFile(out, html); console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB): bundle ${(lib.outputFiles[0].text.length / 1024).toFixed(0)} KB + ${order.js.length} chunks`); }
