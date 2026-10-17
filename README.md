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

## GitHub Pages / index.html

The ready-to-upload website is in `docs/`, starting at `docs/index.html`. Keep all folders beside it, including `assets`, `images`, `fonts`, `about`, `contact`, `work`, and `resume`. The HTML needs these assets and pages.

For this repository the configured address is:

`https://angelomig.github.io/KNB-GRANT-WEBSITE/`

To publish:

1. Upload or push the repository, including the generated `docs/` folder, to `AngeloMig/KNB-GRANT-WEBSITE` on branch `main`.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose **main** and **/docs**, then **Save**.
5. Wait for GitHub's Pages deployment to finish. The address above is the intended URL; it is live only after deployment succeeds.

To regenerate these static files after editing the Astro source:

```sh
npm run build:github
```

This command builds the GitHub subdirectory paths and copies the result into `docs/`, with `.nojekyll` for direct static hosting. Bundled CSS, scripts, and fonts use the visible `assets` folder. Unrelated documentation such as `docs/VERIFICATION.md` is preserved. No Node installation is required to host the generated files.

For a different repository, set `GITHUB_REPOSITORY=owner/repository` when running the build. For a repository named `owner.github.io`, the build uses the domain root automatically. `npm run build` continues to build the original root-hosted version into `dist/`.

GitHub publishing reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
