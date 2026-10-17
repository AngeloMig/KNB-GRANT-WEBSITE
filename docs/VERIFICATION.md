# Verification

Tested October 17, 2026 against the local production build at `http://127.0.0.1:4321/`.

## Automated checks

- Astro check: 17 files, zero errors, warnings, or hints.
- Astro build: ten static HTML pages, robots.txt, sitemap index and sitemap.
- Built-output review: every HTML page has one H1, a description, and a canonical URL on the configured site origin.
- Twenty distinct local asset/link paths checked against generated output; no missing files.
- Thirteen HTTP routes checked, including all project pages, About, Contact, the résumé PDF, robots.txt, and both sitemap files; all returned 200.
- Public HTML scanned for home-address fragments, date-of-birth text, password notes, and private Webflow preview links; no matches.
- Production dependency audit: zero known vulnerabilities at verification time.

## Lighthouse

Lighthouse 13.5.0, local production preview, Chrome headless. Default simulated mobile settings and desktop preset were used. Scores describe these runs, not Google rankings or a public production deployment.

| Homepage category | Mobile | Desktop |
| --- | --- | --- |
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |

The initial mobile accessibility score was 98 because project headings skipped a level. The headings were corrected from H3 to H2 and the audited score reached 100. Responsive WebP source sets were added to reduce image downloads.

## Browser checks

- Reviewed desktop, 768px tablet, 390px mobile, and 320px small-mobile layouts.
- Fixed overflow of section-detail text at the smallest width. The final 320px homepage and project view had no horizontal overflow.
- Reviewed About, Contact, and the longer Valiant Finance project heading on mobile.
- Shopify filter displayed two projects; Webflow displayed three; WordPress displayed one; All restored all six.
- Native dialog navigation opened and closed. Escape closed it and returned focus to the menu trigger.
- Services menu link closed the dialog and navigated to the section anchor.
- Clicked a project card and confirmed navigation to its detail page.
- Verified email, LinkedIn, and résumé link destinations.
- All six homepage project images loaded. Fonts loaded from local files.
- Browser error log was empty during the final homepage review.
- Reduced-motion CSS removes animations, hover transforms, and smooth scrolling. This is implemented but was not tested with a screen reader or physical assistive device.

## Résumé and images

The public-safe résumé is a separate one-page professional summary. It was rendered to PNG and visually reviewed; text extraction confirmed no home-address or birth-date fragments. Current public project screenshots and the social preview were visually inspected. Original source documents were not copied into the public build.

## Limits and release details

The registered Sites deployment is owner-private by default. Public search indexing requires a public site. The canonical origin comes from `PUBLIC_SITE_URL`, with the registered Sites origin as the default. Set it to the final public domain before a custom-domain release.

Exact project contribution, agency credits beyond those documented, approved historical screenshots, availability, and domain choice remain content decisions for Grant. Project pages avoid unconfirmed responsibilities, dates, and outcomes.

QA reports and screenshots are kept in ignored `tmp/` and `output/` directories. They are not shipped in the public static build.

## GitHub Pages export

Prepared a second static build for `https://angelomig.github.io/KNB-GRANT-WEBSITE/`, with the entry page at `docs/index.html`. The ordinary root-hosted build still succeeds.

- Astro check: 19 files, zero errors, warnings, or hints.
- GitHub export: ten HTML pages; CSS, scripts, images, fonts, and internal links use the repository prefix.
- Thirty-two distinct resources and page links returned HTTP 200 when served under `/KNB-GRANT-WEBSITE/` locally.
- All generated HTML canonical URLs use the intended GitHub Pages origin and repository path.
- Browser review confirmed font loading, the homepage presentation, and project navigation under the repository path.
- The upload ZIP contains the complete `docs/` website and upload instructions. It excludes this verification document.
- GitHub publication is not verified; the current Git credentials do not have push permission to the target repository.
