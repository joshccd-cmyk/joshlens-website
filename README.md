# josh.lens — graduation photography site

Static site. No build step, no framework install: Vercel serves the repo as-is.

## What deploys

| file | role |
| --- | --- |
| `index.html` | **generated build** — what Vercel serves. Do not hand-edit; run `node build.mjs`. |
| `Josh Lens Site.dc.html` | **source of truth.** Every design change happens here; `index.html` is regenerated from it. |
| `support.js` | runtime the page loads (must stay next to `index.html`) |
| `assets/` | photography, thumbs, favicon, OG card |
| `build.mjs` | regenerates `index.html` from the source (`--check` fails if stale) |
| `vercel.json` | caching, security headers, `/book` + `/gallery` redirects |
| `robots.txt`, `sitemap.xml` | crawl + index |

`index.html` differs from the source file in exactly two ways: a "generated" comment, and the
second Google Fonts stylesheet is dropped. That stylesheet only serves the `displaySerif` tweak's
alternates (Newsreader, Source Serif 4, Crimson Pro, Petrona); the shipped design uses **Instrument
Serif**, which the first font link already loads — so in the build it was one render-blocking
request for a font that never paints.

**If you change the `displaySerif` tweak away from Instrument Serif**, the new family has to be
added to the first font link in the source file, or the build will fall back to the browser serif.

```sh
node build.mjs           # regenerate index.html after any design change
node build.mjs --check   # fails if index.html is stale (good pre-commit / CI check)
```

## Deploy

1. Push to GitHub.
2. Vercel → New Project → import the repo.
3. Framework preset **Other**, build command **empty**, output directory **`.` (root)**.
4. Add the domain, then update `joshlens.com` in the source file's canonical, OG, Twitter, and
   JSON-LD tags if the real domain differs — those are absolute URLs and won't follow the domain.

## Performance notes

- Hero image is preloaded with `fetchpriority="high"`; all 57 gallery images are `loading="lazy"`.
- `/assets/*` is immutable-cached for a year. Re-uploading a photo under the same filename will be
  served stale — save it under a new filename instead.
- React and the template runtime come from unpkg (pinned versions) with a preconnect hint. If you
  ever want zero third-party requests, those three scripts can be vendored into `/vendor`.
- Photos are the page weight. Before adding new ones, resize the long edge to ~2000px and re-export
  at JPEG q78 — see `PHOTO-NOTES.md`.

## Third-party

Calendly (booking embed) and FormSubmit (contact form) are loaded from their own domains, so
neither needs a server. The form posts to josh.ccd@gmail.com.
