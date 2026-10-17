# Grant Payad portfolio

An Astro + TypeScript portfolio closely following the Parker reference, with self-hosted Big Shoulders Display and Archivo fonts, real project screenshots, and a small amount of progressive-enhancement JavaScript.

## Development

Use Node 22.22+ (the Codex bundled Node 24 runtime also works).

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

## Content

Edit `src/data/profile.ts` for professional information and `src/data/projects.ts` for selected projects. Screenshot assets are in `public/images/projects`. Do not add the original résumé or spreadsheet to the public folder. The public résumé is a separately prepared summary.

Set `PUBLIC_SITE_URL` to the final public origin before a custom-domain release. Metadata, canonical URLs, robots.txt, and sitemap use this origin. New Sites hosting is private by default; indexing requires a public deployment.

## Attribution and factual limits

Platform and engagement types are taken from the user's supplied spreadsheet. Project pages use short overviews rather than unconfirmed responsibilities, outcomes, or dates. Screenshots show current public homepages, captured October 2026; they may differ from Grant's delivered work. Confirm his exact contribution before expanding case studies. The Parker and Williams templates are visual references; this is a custom implementation.

See `CLAUDE_HANDOFF.md` for implementation notes and review status.
