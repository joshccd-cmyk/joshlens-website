// Regenerates index.html (the deployed build) from the source Design Component.
// Usage: node build.mjs        Check only: node build.mjs --check
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "Josh Lens Site.dc.html";
const OUT = "index.html";
const BANNER = '<!-- GENERATED BUILD — do not hand-edit. Run `node build.mjs`. Source: "Josh Lens Site.dc.html". -->';
// Google Fonts request for the displaySerif tweak's alternates (Newsreader, Source Serif 4,
// Crimson Pro, Petrona). The shipped design uses Instrument Serif, which the first font link
// already provides — so this whole stylesheet is dead weight in the build.
const TWEAK_FONTS = /\n?<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Newsreader[^"]*" rel="stylesheet">/;

// Every photo under assets/ needs a downscaled twin at the same path under assets/opt/ — phones
// load only that tier, with no fallback, so a missing twin is a 404 on the platform that matters most.
function auditTiers() {
  const photos = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "opt") continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.jpe?g$/i.test(e.name)) photos.push(p);
    }
  })("assets");
  return photos.filter(p => !existsSync(p.replace(/^assets/, "assets/opt")));
}

const orphans = auditTiers();

if (orphans.length) {
  console.error("build: " + orphans.length + " photo(s) missing from the mobile tier (assets/opt/):");
  for (const o of orphans) console.error("  " + o);
  console.error("Downscale each to long edge 1600px (heroes 1800, thumbs 900) and commit.");
  process.exit(1);
}
console.log("build: mobile tier complete — every assets/ photo has an assets/opt/ twin.");

const src = readFileSync(SRC, "utf8");
if (!TWEAK_FONTS.test(src)) {
  console.error("build: tweak-font stylesheet not found in " + SRC + " — did the font links change?");
  process.exit(1);
}
const out = src.replace(TWEAK_FONTS, "").replace("<head>", "<head>\n" + BANNER);

// Secondary pages: straight copies of their source DC.
const PAGES = [["Seasons.dc.html", "seasons.html"]];
const builds = [[OUT, out], ...PAGES.map(([s, o]) => [o, readFileSync(s, "utf8").replace("<head>", "<head>\n" + BANNER.replace('"Josh Lens Site.dc.html"', '"' + s + '"'))])];

if (process.argv.includes("--check")) {
  for (const [o, content] of builds.slice(1)) {
    let cur = ""; try { cur = readFileSync(o, "utf8"); } catch {}
    if (cur !== content) { console.error("build: " + o + " is stale — run `node build.mjs` and commit the result."); process.exit(1); }
  }
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch {}
  if (current !== out) {
    console.error("build: " + OUT + " is stale — run `node build.mjs` and commit the result.");
    process.exit(1);
  }
  console.log("build: " + OUT + " is up to date.");
} else {
  for (const [o, content] of builds) {
    writeFileSync(o, content);
    console.log("build: wrote " + o + " (" + content.length + " bytes)");
  }
}
