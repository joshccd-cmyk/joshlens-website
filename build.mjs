// Regenerates index.html (the deployed build) from the source Design Component.
// Usage: node build.mjs        Check only: node build.mjs --check
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "Josh Lens Site.dc.html";
const OUT = "index.html";
const BANNER = '<!-- GENERATED BUILD — do not hand-edit. Run `node build.mjs`. Source: "Josh Lens Site.dc.html". -->';
// Google Fonts request for the displaySerif tweak's alternates (Newsreader, Source Serif 4,
// Crimson Pro, Petrona). The shipped design uses Instrument Serif, which the first font link
// already provides — so this whole stylesheet is dead weight in the build.
const TWEAK_FONTS = /\n?<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Newsreader[^"]*" rel="stylesheet">/;

const src = readFileSync(SRC, "utf8");
if (!TWEAK_FONTS.test(src)) {
  console.error("build: tweak-font stylesheet not found in " + SRC + " — did the font links change?");
  process.exit(1);
}
const out = src.replace(TWEAK_FONTS, "").replace("<head>", "<head>\n" + BANNER);

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch {}
  if (current !== out) {
    console.error("build: " + OUT + " is stale — run `node build.mjs` and commit the result.");
    process.exit(1);
  }
  console.log("build: " + OUT + " is up to date.");
} else {
  writeFileSync(OUT, out);
  console.log("build: wrote " + OUT + " (" + out.length + " bytes)");
}
