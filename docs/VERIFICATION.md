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

## Mobile phone performance pass — November 5, 2026

Scope: the development-only `/ideas/phones/` concept and the existing homepage's mobile dot-name animation. The phone concept is still excluded from static routes; this pass does not publish it or replace the homepage composition.

Measured asset changes, using `scripts/optimize-phone.mjs`:

| Resource | Supplied original | Web derivative |
| --- | ---: | ---: |
| GLB bytes | 1,713,400 | 235,024 |
| Triangles per phone | 29,544 | 17,157 |
| Mobile display canvas | 512 × 1110 | 256 × 555 |

The original GLB remains unchanged. The derivative removes the unused wallpaper before decoding, simplifies geometry with a 0.001 error bound, and uses Meshopt compression. This reduces transferred model bytes by 86.3% and geometry triangles by 41.9%. Mobile display textures use one quarter of the previous pixel count. Licensing and derivative modifications are disclosed in the model README and visible attribution.

Browser checks in the local development server:

- Visually reviewed the supplied orange model's front/reverse presentation on desktop (1280px) and mobile (390px). Phone concept and homepage had no horizontal overflow at the checked 320px / 390px widths.
- Mobile diagnostics confirmed 256px screen textures, two cached project screens, 24 draw calls and 34,314 rendered triangles for the pair. The desktop derivative scene reported 28 draw calls and 39,400 triangles, including transparent material passes.
- The mobile scene automatically settled after its short introduction. Its recorded render count stayed at 175 across separate reads while idle; Next projects rendered one additional frame and updated the project links. Rotation woke rendering and settled again. The cache stayed at two screens.
- Vertical scrolling suspends WebGL rendering. Offscreen and hidden states cancel scheduled frames; stage-based lazy initialization also leaves the scene unmounted when the phone stage is never approached.
- The current homepage's mobile name no longer scatters across a full-screen canvas or runs recurring simulated touch ripples. Its name canvas uses a mobile DPR cap of 1.25. The existing orbit and project controls remain.
- Astro check: zero errors / warnings, with two existing hints in other preview files. Static build: 12 pages; an existing large-chunk warning remains for the lazily imported Three.js preview bundle. The phone preview is not a public static route.

These are asset measurements, browser lifecycle checks and responsive desktop-browser checks. No new Lighthouse score, real-device FPS, thermal/battery result, iOS Safari result, Android Chrome result, or throttled-network result is claimed. Physical iPhone/Android verification remains necessary before promising smoothness across devices.

## Final scope: six mobile orbital models and play button — November 5, 2026

The homepage continues to render `HomeHero.astro`; its original desktop browser-card orbit is retained. The two-phone concept is not used on the homepage. Only the mobile project-phone visuals are replaced.

- Confirmed six GLB instances at 390px, each with its own project screenshot. Clicked Next project through Road Armor, Omenz, Coptrz, Skinistry, Light My Bricks and back to Tero; active captions and project links followed the existing orbit.
- At 1280px the WebGL canvas was `display:none`, model instances were not initialized, and all six original browser cards remained. Visually reviewed the desktop orbit.
- The final mobile derivative is 315,504 bytes and preserves all 29,544 original triangles per model. It removes the unused wallpaper, compresses geometry and increases position/normal/UV precision; no geometry simplification is applied to this derivative. Geometry is shared between the six instances; backmost phones are culled.
- Display textures are now 512px wide, with their height calculated from the actual model display aspect. Source images retain their proportions; a larger top safe area puts website navigation below the Dynamic Island. Anisotropic filtering improves angled screens.
- Render density starts at up to 3× for high-density displays (up to 1.75× on constrained devices), then decreases in 0.25 increments only after sustained slow animation frames. The responsive test browser used 1.5× on its 1× display. These settings are not a claim of 4K imagery or measured device FPS; source project images are 440px wide.
- Verified the renderer stays suspended offscreen: its frame count remained 699 before and after the video playback check. Idle rendering depends on orbit changes; it has no independent ambient render loop. Vertical scroll intent is released before a horizontal drag is captured.
- Replaced the testimonial play emoji with an SVG triangle. In the 390px browser check, Carlos's video started, advanced beyond seven seconds, exposed native controls and paused with the keyboard. The play button returns on pause and failed starts allow retry with an accessible status message.
- Source checks passed with zero errors/warnings and two existing preview hints. The GitHub Pages export is regenerated from source with existing quote-page encryption retained. Public deployment / GitHub push and physical iOS/Android performance are not verified by these local checks.

Final QA images: `output/mobile-six-project-orbit.jpg`, `output/mobile-video-play-fixed.jpg` and `output/original-desktop-orbit-restored.jpg` (ignored, not included in the public export).

## Scroll clipping and lower-page work — November 5, 2026

- Reproduced the phone-top cut at 390px and scroll position 101px. Projected model bounds extended 12–29px above the old 441px-high canvas during tilt; these were actual clipped pixels, not a missing portion of the source model.
- Added symmetric drawing padding without changing the ring height, project positions, or desktop presentation. At the same 101px scroll position the padded canvas measured 675px high, with 117px padding and projected upper bounds at +108px. Visual review confirmed intact rounded tops. Also checked continued downward scrolling to 169px.
- Removed the scroll-stop freeze while the hero is visible. Dev counters recorded eight and then twelve frames rendered during scrolling, demonstrating updates occur before the scroll settles. Vertical-scroll rendering is capped at 30 fps to limit GPU work; idle/offscreen rendering still stops.
- At the page bottom (scroll position 7,321px), model state was `offscreen` and its render count stayed at 912 across separate reads. The hero's orbit, name and dotted-track RAF callbacks now also suspend offscreen/hidden. Project parallax only reads intersecting devices and batches reads before writes; unchanged canvas dimensions no longer reallocate the track on resize.
- The 1280px desktop browser-card orbit continued advancing with the model canvas hidden. The mobile renderer resumed after returning from the footer and the Next project control remained functional.
- These checks reproduce and verify the clipping regression and renderer lifecycle in a desktop browser at mobile width. They do not establish physical-phone FPS or an end-to-end scroll benchmark.

Before/after QA captures: `output/orbit-scroll-cut-before.jpg` and `output/orbit-scroll-cut-fixed.jpg`.

### Repeated screenshot report and publishing check

- The supplied screenshot shows the public GitHub Pages site. Fetching that homepage confirmed it still used `HomeHero...Bdl8nn0N.js` and did not contain `--model-padding`; the local export contained the newer fix. This is a confirmed live/local version mismatch, not evidence that the local padding change was deployed.
- GitHub metadata reported no push permission. The checkout's normal dry-run push was rejected with HTTP 403 for `Grant-Rivyl` to `AngeloMig/KNB-GRANT-WEBSITE`. No remote changes were made.
- Further isolated the mobile canvas from the CSS perspective wrapper and allowed mobile hero vertical overflow. At 390px / scroll 101px, all six instances remained present and the projected upper bound was +107px inside the padded canvas. The rounded top was visibly intact. Body horizontal clipping and the desktop layout remain.
- Motion now targets 60 fps with an adaptive moving buffer capped at 2× density (1.5× on constrained devices); a single full-density still frame is requested 180ms after the last pose change. This supersedes the earlier 30fps scroll setting. The renderer no longer draws solely because a native scroll event fired when the orbit pose is unchanged. These are configured limits, not physical-device FPS results.
- Rechecked the remote during this work: an owner push advanced `main` to `dd42fc7`, and GitHub Pages run `41915418638` was still in progress while the public page served the older build. The latest canvas-isolation changes and regenerated export remain local; the agent did not create that owner commit or push it. The run's build and report jobs succeeded; its deployment job was still in progress at the final job-status check.
- Repeated Next project through all six entries and back to Road Armor after the refinement. No horizontal overflow was detected. A subsequent idle read showed six instances, `still` quality, and a +108px upper projected bound. Final local QA image: `output/orbit-top-smooth-final.jpg`.

## Native screenshot recapture and measured scroll pass — November 5, 2026

- Recaptured all six current public project homepages in mobile portrait (720 × 1564) and desktop (1920 wide; five 1080 high and Light My Bricks 1072 high). Reviewed the capture contact sheet, corrected the Light My Bricks captures to remove overlays, and generated 66 WebP variants without enlargement. These are fresh current-site previews, not evidence of Grant's precise historical contribution. Legacy tall desktop hover captures retain their prior resolution/date.
- Mobile native-source pixel count increased from 420,640 to 1,126,080 per screenshot (2.68×). The six 720px WebPs total 556,228 bytes (~543 KiB). Actual GLB screen canvases are now 720px wide. Responsive desktop sources extend to 1920px. These are HD assets, not native 4K.
- Local development browser, warm images, native Page Down/Page Up scrolling, viewport 390 × 844: 344 moving-frame intervals; weighted average 8.36ms; worst per-section p95 9.3ms; zero intervals >33.4ms; zero observed long tasks. Covered hero, work, reviews, services, experience, closing and footer. The browser refresh rate is independent of the WebGL 60fps render cap.
- Desktop browser viewport 1280 × 720: 183 moving-frame intervals; weighted average 8.61ms; worst per-section p95 16.8ms; zero intervals >33.4ms; zero observed long tasks. These are limited computer-browser frame-pacing samples, not physical iOS/Android FPS, GPU frame-presentation traces, cold-load benchmarks or Lighthouse scores. No CPU/network throttling was applied.
- During the lower-page mobile pass the WebGL render count remained 161 across reads with state `offscreen`. At scroll 101px the six-instance renderer used 720px screen textures, 117px drawing padding and a 675px-high canvas; projected model tops remained positive (+92 to +115px in sampled poses). No horizontal page overflow at 390px or 1280px. Desktop model canvas remained hidden and browser cards loaded responsive screenshot sources.
- Source check: zero errors/warnings, two existing hints. GitHub export: twelve pages built successfully; existing private quote encryption retained. Lazy Three.js chunk still triggers the existing large-chunk advisory. Development scroll instrumentation was absent from exported JS.
- Publishing failure verified from GitHub check annotations: previous Pages deploy timed out; subsequent deploy rejected with HTTP 400 due to the earlier in-progress deployment. See run https://github.com/AngeloMig/KNB-GRANT-WEBSITE/actions/runs/41917049894. Local source/export are ready; remote publication remains unverified and the connected account lacks push permission.

QA images: `output/hd-mobile-orbit-final.jpg`, `output/hd-desktop-orbit-final.jpg`, `output/hd-capture-contact-sheet.jpg`. Raw audit JSON and images are ignored local artifacts.

## Mobile skeleton and fallback lifecycle — November 5, 2026

- Tested the actual GitHub export through an ignored local static QA server at port 4322. Tests deliberately delayed the model response by 30 seconds, returned a 404 for the model, and separately returned a 404 for the main hero module. These failure modes are controlled by the QA server, not shipped application switches.
- At 390 × 844, loading state hid the legacy orbit visuals (`visibility:hidden`) and displayed the skeleton. The inline 3.5-second watchdog restored the legacy design while a delayed model was still pending; the same page subsequently reached `ready`. A failed model request cleared `aria-busy`, hid the skeleton and showed the fallback. Blocking the main hero module independently also reached fallback, proving that the watchdog does not depend on that module.
- Normal loading reached `ready` with six model instances and visible attribution. The first reveal follows a successful renderer frame. Steady mobile fallback and ready states both measured 612.1875px for the orbit container at the tested size, after reserving attribution space.
- Desktop at 1280px hid both skeleton and model canvas. Switching back to 390px resumed the model renderer; frame count advanced and Next project remained functional. Fixed breakpoint caching in the orbit controller discovered during this resize test.
- Source checks passed with zero errors/warnings and two existing hints; GitHub export built twelve pages and retained private quote encryption. The existing lazy Three.js chunk advisory remains. No repeated device-FPS or Lighthouse audit was performed for this loading-state change.

Verified captures: `output/orbit-loading-placeholder-verified.jpg`, `output/orbit-loading-error-fallback.jpg`, `output/orbit-loading-ready-verified.jpg`.

## Project detail phone enlargement — November 5, 2026

- At 390 × 844, the old detail preview used a ~98px phone in a 327px-wide landscape canvas. Phone mode now measures 295px wide, with a portrait canvas sized to contain the complete device and its controls.
- Checked 320px (phone ~225px), 390px (295px) and 1280px desktop (360px phone mode). No horizontal page overflow. The Desktop/Phone buttons worked with Enter and kept their pressed states synchronized. Fresh desktop navigation still selects Desktop.
- Verified real navigation from the mobile homepage's front hero phone to `/work/tero/`; it opened directly in Phone mode at 295px. This shared project-page template applies to all six projects.
- Source check: zero errors/warnings, two existing preview hints. QA image: `output/project-phone-large-mobile.jpg`. No new performance score is claimed for this sizing change.

## Real supplied model in project Phone mode — November 5, 2026

- Replaced the visible CSS phone in ready state with one actual supplied GLB instance on all six project pages. The large CSS phone remains as the reserved layout box and error fallback. Reuses the 315,504-byte orbital derivative, native 720px project screen and Apple-style finish adaptation; creator/license attribution stays linked in the viewer.
- At 390px, inspected the front website, rotated back, camera housing, buttons and frame. Native horizontal dragging changed yaw to 0.960 radians; keyboard rotation reached 2.531; Home reset to 0. Rotate buttons and Front view worked. Screenshots of the actual GitHub export are combined in `output/project-actual-3d-proof.jpg`.
- Renderer idle counter stayed 1 across reads. After interaction settled it stayed 200 across native page scrolling. At 1280px, initial Desktop mode had not mounted a model; selecting Phone reached ready with one instance and 360px layout bounds. Returning to Desktop hid the viewer with its frame counter unchanged. No horizontal overflow at checked widths 320, 390 and 1280px.
- Real mobile hero-phone click opened `/work/tero/`, selected Phone automatically and reached ready with the correct Tero texture. The scene shares the six-page template.
- Production export tested through ignored local static QA server: forced GLB 404 → visible image fallback, hidden viewer and cleared busy state; normal response → ready with one instance and `/KNB-GRANT-WEBSITE/models/iphone-17-pro-max-orbit.glb`. Verified all six exported project pages contain the correct viewer asset URL.
- Source checks passed: zero errors/warnings and two existing hints. Twelve-page GitHub export passed with existing large lazy-chunk advisory and quote encryption retained. Preview server restarted to clear stale development dependency URLs. No new Lighthouse or physical-phone FPS result is claimed.

## Orbital loading label — November 5, 2026

- Added visible “Loading projects” and three opacity-only pulsing dots to the existing loading region. Mobile centers it in the skeleton; desktop places it between the orbital preview and caption. The indicator does not add layout height. Reduced-motion CSS disables the pulse.
- At 390px in the built export, an intentionally delayed model showed the label/skeleton with carousel busy=true. Normal loading reached ready with label hidden and busy=false. A blocked hero module reached fallback and also hid the label and cleared busy.
- At 1280px, observed desktop preview loading with label displayed and model canvas hidden, then preview ready with label hidden and busy=false after its opening/image readiness signal.
- Source checks: zero errors/warnings, two existing hints. GitHub build: twelve pages, existing lazy-chunk advisory, private quote encryption retained. No new FPS or Lighthouse benchmark for this small feedback change. Screenshot: `output/orbit-subtle-loading-label.jpg`.

## Desktop/mobile PageSpeed audit — November 5, 2026

Official Google report: https://pagespeed.web.dev/analysis/https-angelomig-github-io-KNB-GRANT-WEBSITE/7e116rncjz

| Published homepage (Google Lighthouse 13.6) | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 91 | 100 | 96 | 100 |
| Mobile | 49 | 96 | 96 | 100 |

- Mobile: FCP 1.1s, LCP 3.8s, TBT 16,830ms, CLS 0, Speed Index 23.8s. Emulated Moto G Power / slow 4G. Desktop: FCP/LCP 0.4s, TBT 0ms, CLS 0.18, Speed Index 1.2s. No real-user data available. These are single lab runs.
- Direct PageSpeed API requests returned HTTP 429 shared quota errors; the official PageSpeed website completed both analyses. Saved rendered report text and screenshots in ignored output files.
- Live HTML contains the 720px screens but not the new orbital loading label, so it is behind the current production export.

| Latest production export (local Lighthouse 13.5 / Chrome 156) | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Homepage desktop | 59 | 100 | 96 | 100 |
| Homepage mobile | 28 | 96 | 96 | 100 |
| Light My Bricks project mobile | 62 | 100 | 100 | 100 |

- Latest homepage desktop: LCP 1.1s, TBT 1,990ms, CLS 0. Latest homepage mobile: LCP 16.1s, TBT 14,410ms, CLS 0. Project mobile: LCP 3.4s, TBT 1,860ms, CLS 0.
- Local runs used the built static GitHub export, gzip for text assets, 10-minute caching, Lighthouse default simulated throttling (desktop and mobile presets), clean Chrome profiles and serial runs. They did not audit the Astro development server. Different browsers/hardware, versioned source and local/CDN/network behavior prevent a direct numerical comparison to Google. No performance regression percentage is inferred.
- Primary finding: mobile startup main-thread blocking is substantial. Local diagnostics attribute work to page startup callbacks, orbital WebGL initialization and dotted-title animation. This is separate from the earlier warm scroll frame-pacing checks; those checks did not measure cold loading.
- Other findings: published desktop CLS 0.18; mobile touch targets; a menu preview image declares 480×270 while the refreshed Light My Bricks image is 480×268. Both published form factors retain SEO 100.
- Recommended optimization order: profile and reduce/chunk actual canvas/WebGL initialization while retaining the approved 3D orbit; prepare only visible decorative content; address desktop layout shift, touch targets and the incorrect image dimensions. Re-audit the exact deployed revision afterward.
- Reports: ignored output/pagespeed-summary-2026-11-05.json, pagespeed-latest-desktop-2026-11-05.report.html, pagespeed-latest-mobile-2026-11-05.report.html and pagespeed-project-mobile-2026-11-05.report.html. Project trace/devtools data were saved for follow-up profiling. No frontend code changed during this measurement pass.

## Quote design audit — 9 November 2026

Scope: local quote dashboard, classic and guided editors, pricing, invoices, payment entry, deletion confirmation, email composition, business profile, support setup and blank website-audit creation. Inspected at 1280px desktop, 768px tablet, 390px and 320px mobile. Used sample data; did not connect the tracker, send email, save a payment, accept a quote, or modify live records. Real iPhone keyboard/zoom and external tracker integration remain outside this design audit.

### Button refinement completed

- The fixed mobile toolbar stays 49px high and aligned with the navigation circle. Its buttons now paint a 36px-high pill inside a 44px target. The previous global 2px outline with 6px external offset made focused buttons occupy 60px visually, exceeding the toolbar; focus outlines are now inset.
- The mobile PDF accessible name now matches its visible “Download PDF” label; narrow guided mode retains visible “PDF”. Controls fit at 320px and 390px. Proof: ignored `output/quote-buttons-refined-390.jpg` and `quote-buttons-refined-320.jpg`.

### Measured production baseline

Lighthouse 13.5, local static `dist-github` export served with text gzip and 10-minute cache, clean Chrome profile, default simulated mobile/desktop presets, serial runs. These are first-screen local lab measurements from the build before the button refinement, not deployed results or an audit of every saved-quote state. SEO was intentionally excluded because this private tool must stay noindex.

| Preset | Performance | Accessibility | Best practices | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop | 100 | 96 | 100 | 0.6s | 0ms | 0.020 |
| Mobile | 90 | 96 | 100 | 2.1s | 290ms | 0.049 |

Reports: ignored `output/quote-audit-{desktop,mobile}-2026-11-09.report.{html,json}`. Manual DOM measurements: `output/quote-design-audit-measurements-2026-11-09.json`.

### Remaining findings, prioritized

No P0 blockers found. Nine grouped findings: three P1, five P2, one P3. Manual rubric: accessibility 2/4, performance 3/4, responsive design 2/4, theming 3/4, design anti-patterns 2/4 = 12/20 (significant refinement needed). This rubric is separate from Lighthouse.

1. **P1 — Keyboard file actions.** `quote.astro` uses labels around `hidden` file inputs for Restore backup, logo and signature uploads. Those labels have no keyboard activation/focus target. Replace with native focusable file controls or real buttons that activate the pickers. Check WCAG 2.1.1.
2. **P1 — Persistent form labels.** `q-brief` and `q-audit-paste` rely on placeholder text instead of explicit labels. Dynamic payment entry exposes accessible names but lacks visible field labels for amount, date, method and reference once values are present. Add associated, persistent labels (WCAG 3.3.2; programmatic relationships under 1.3.1).
3. **P1 — Contrast.** Lighthouse measured inactive-but-operable section numbers in `.q-jump a i` at 3.23:1, below the 4.5:1 text threshold. Normal input borders use neutral `oklch(0.83 0 0)` against white, about 1.69:1; increase to at least 3:1 where the border identifies the field. Dashboard zero-alert opacity also needs review; do not treat enabled controls as disabled. Check WCAG 1.4.3 and 1.4.11.
4. **P2 — Inconsistent touch sizes and text scale.** Many secondary actions are 28px high, view tabs 31px, payment inputs about 36px and general fields use 14px text. The fixed toolbar and invoice actions use 44px. Establish consistent primary/secondary visual sizes with roomy hit areas. Below 44px is a comfort concern, not automatically a WCAG AA failure; 2.5.8 has a 24px minimum and spacing/equivalence exceptions.
5. **P2 — Competing navigation.** Guided mode shows a next-business-action callout, stages, section tabs, content Back/Next and fixed Next/PDF controls. At 390px these occupy most of the initial screen before the active form. Keep one primary progression action and clarify the separate business recommendation.
6. **P2 — Focus placement.** Escape from the mobile More menu leaves focus on the document instead of returning it to More. Support setup focuses a price input, scrolling past the top package choices. Return focus to the invoking control and open long dialogs at their title/start.
7. **P2 — Quote-row semantics.** Dashboard rows are clickable, focusable articles with an Enter handler, but their open action is not exposed as a named link/button. Add an explicit Open quote control while preserving the independent status and delete actions.
8. **P2 — Startup work.** Mobile baseline recorded 290ms TBT, about 59ms forced reflow in the quote entry module and 31KiB estimated unused CSS. `renderEditor()` builds multiple hidden sections. Profile/defer hidden panel rendering and split quote-specific CSS; preserve lazy PDF loading. Do not infer a live regression from these local results.
9. **P3 — Visual density.** Large condensed marketing typography, nested rounded panels, many pill controls and clipped single-line checklist descriptions compete with the financial/editor content. Simplify the task area's heading scale and containers; use multiline display/editing for long descriptions.

Strengths to retain: monochrome tokens; native dialogs; invoice action grouping; labeled destructive controls; confirmation plus Undo; debounced local saving and backup notices; lazy PDF loading; no observed page overflow at the tested widths; noindex and encrypted published quote page.

The source detector returned two image warnings for hidden logo/signature previews. Both are intentional optional previews, populated only when an image exists; they are false positives, not shipped broken images. This audit did not inject overlays or change browser security settings.

Recommended order: fix P1 keyboard/label/contrast issues, unify mobile controls and progression, improve focus/semantics, profile startup, then finish visual polish. Remaining findings are documented, not represented as fixed by this button change.
