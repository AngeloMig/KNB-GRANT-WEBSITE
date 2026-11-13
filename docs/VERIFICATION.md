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


## 13 November 2026 — public support plans and navigation redesign

Scope: `/plans/`, shared menu and finder context passed to the estimator. Quote audit findings above remain separate. The orbital homepage was not redesigned.

### Interaction and responsive verification

- Browser checks: 1280×900, 768×1024, 390×844, 320×740 and menu at 320×568. No document horizontal overflow. Four primary destinations, three smaller actions and footer links remain reachable. Phone-to-tablet close-button placement corrected.
- Empty Continue stays on the current step with an error and radio focus. Keyboard radio changes update completed recommendations. Weekly feature work gives Large; occasional maintenance gives Basic; same-day reply gives at least Medium; dedicated work gives VIP.
- Known task IDs/ranges pass to inquiry notes. Actual VIP handoff and reload retained plan and notes. Reset/reload produced zero checked inputs, one visible first step and no ready recommendation. FAQ disclosure verified.
- Narrow-phone completion reveals the result heading. The 49px result bar clears the navigation circle and hides while the result is visible. Native controls and keyboard focus retained.
- No contact details entered, contact Continue or send activated, or external message sent. Existing estimator lead capture on contact Continue was not changed or audited.
- Six logic tests pass, covering all 36 combinations, incomplete/unknown answers, unique jobs, response ordering, manual plan choice and repository-base handoff. Astro check: 0 errors, 0 warnings, 4 existing hints. GitHub build: 18 pages, encrypted quote; existing lazy-chunk advisory. No console errors in final plans browser session.

### Final production-build lab audit

Lighthouse 13.5, clean headless Chrome, local `dist-github` repository-base export, text gzip and 10-minute cache, default simulated mobile/desktop presets. Final runs were serial. Initial page only; not the deployed GitHub URL or every interaction state.

| Preset | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mobile | 99 | 100 | 100 | 100 | 1.7s | 30ms | 0.016 |
| Desktop | 100 | 100 | 100 | 100 | 0.4s | 0ms | 0.009 |

Reports: ignored `output/support-plans-{mobile,desktop}-final-2026-11-13.report.{html,json}`. Proofs: `output/support-finder-desktop-final.png`, `support-finder-mobile-final.png`, `support-navigation-desktop-final.png`, `support-navigation-mobile-final.png`. Automated accessibility scoring is not a complete manual certification. Inherited unscored label/content-name advisories concern the shared wordmark/footer name and are not reported as fixed here.

Updated source and GitHub Pages `docs/` export are ready locally. No commit, push or live deployment performed. Dev server restarted on 4321 after checks/build.


### 13 November 2026 — plain-language monthly plan examples

Owner requested concrete descriptions for 20/40/80 hours, then shorter copy aimed at CEOs and nontechnical readers. Updated `src/data/support-plans.ts` and `src/pages/plans.astro`: everyday care for Basic; campaign/pages and shopping improvements for Medium; larger features, business-tool connections and slow pages for Large. Each has four short points and an illustrative example month. Planning, work, checking and reporting are included in hours; examples are flexible priorities, not fixed deliverable guarantees. No exact task-hour promises, prices or sales/ranking claims added. Reply windows, planning calls and recommender behavior retained.

Desktop comparison uses a seven-row CSS subgrid to align descriptions, examples, reply windows and CTAs. Tablet uses the existing two-column card layout and phones stack content. Verified at 1440, 768 and 320px with no horizontal overflow; examples and buttons align on desktop. Proofs in ignored `output/support-plan-descriptions-{desktop,mobile}.png`. Astro check: 0 errors, 0 warnings, 4 existing hints; six existing recommendation tests passed. GitHub export regenerated locally; not published. Previous Lighthouse scores above predate this copy/layout change; no fresh score is claimed.


Follow-up: the owner asked for more common services in shorter business language. Each public plan now lists ten short service points, with the heading “Your month could include” and a routine-care/campaign/larger-project example. These remain possible priorities within the purchased hours, not ten guaranteed monthly deliverables. VIP reply policy was explicitly updated by the owner: 15–60 minutes during agreed working hours; emergency reply target of 2–4 hours outside working hours on weekdays and weekends. `vipSupport` in `src/data/support-plans.ts` supplies both the public VIP block and finder recommendation, avoiding conflicting reply copy. Reply time is distinguished from time to fix. Normal Basic/Medium/Large reply windows are unchanged. Latest export includes these changes; six logic tests still pass. Earlier four-point screenshots and audits predate this wording revision.

Final VIP display verified at 1280px and 320px: no document/card horizontal overflow, all reply wording fits, ten service bullets per plan. Proofs: ignored `output/support-vip-reply-times-desktop.png` and `output/support-vip-reply-times-mobile.png`. Final 18-page export succeeded and dev server restarted on 4321.


### 13 November 2026 — compact comparison, dotted title and email previews

- Public support page now uses the existing `SectionTitle` dotted `SUPPORT PLANS` H1 with a compact local size override. Intro copy is smaller; phone detail caption sits on one line below the heading. Support navigation restores `data-title` for the existing dot transition. Existing dot renderer reused, not duplicated. Verified desktop and 320px: readable H1, rendered canvas, no horizontal overflow. Proofs: `output/support-dotted-heading-{desktop,mobile}.png`.
- New `src/components/SupportPlanComparison.astro` replaces the estimator's old gray comparison panels. Same public service data as `/plans/`; compact hour treatment, thin shared rules and actual selected plan in black. Five services visible per card, remaining services in native disclosures; full comparison opens public monthly examples in a new tab. Selected buttons update the existing hours radio and summary, save progress, and stay on the Support step until Continue. Keyboard Enter on summary no longer advances the wizard. The unsupported Most popular hint was removed from `src/data/estimator.ts`. Quote model/prices/contracts were not edited.
- `vipSupport` in shared public data now includes its existing dedicated-developer services, translated into short language, and supplies the public comparison plus estimator caption. This keeps the owner-approved 15–60 minute working-hours reply and 2–4 hour out-of-hours emergency target consistent. Tested Basic/VIP selection, native and nested disclosures via keyboard, restored plan and 320px overflow. No contact details entered, no Contact Continue/send action or external inquiry sent. Proofs: `output/support-comparison-{desktop,mobile}.png`.
- Two isolated parallel read-only reviews covered layout and mechanical spacing; final scoped layout detector returned `[]`. Astro check on 99 files: 0 errors, 0 warnings, 4 existing hints. Six support logic tests pass. Latest GitHub export has 18 pages, encrypted quote; existing lazy chunk advisory. Source/export local, not pushed.
- New DEV-only, noindex route `/ideas/email/` (`src/pages/[preview]/email.astro`) has ten functioning alternatives for the contact email control. Every copy button wrote the correct public email in browser testing; keyboard activation, expandable copy/email tray, copy/email mode switch and 320px layout verified. Browser clipboard restored afterwards. No email app opened or message sent. The live contact control has not been replaced. This route is absent from the static export.
- Owner picked option 9 and requested more creativity, then exact centering and a different smoother animation. Option 9 now centers the address, button and Copy/Copied text independently on the same axis. A small paper slip drops into the stationary button, the clipboard becomes a drawn check, and an outline briefly expands. Motion lasts at most 480ms, uses finite Web Animations and small transform/opacity/SVG updates; no animation loop or added library. Success feedback follows the real clipboard result. Reduced motion skips these animations and retains plain confirmation. Manual address selection, contextual shortcut hint and error fallback retained. Copying again replays the slip. Successful button copying clears the old text selection. Demo only; no live contact change.
- Exact centers measured in browser: all at x187.5 on a 390px viewport and x152.5 on a 320px viewport (15px browser scrollbar); desktop offsets also zero. Actual keyboard and pointer copy passed; selection covers the address, then collapses after successful button copy. No document overflow or preview console errors. Reduced-motion branch inspected in source; no real iPhone or frame-rate benchmark claimed. Proofs: `output/email-idea-9-refined-{desktop,mobile}.png`, `email-idea-9-centered-preview.png`; earlier ten-idea overview `email-ideas-{desktop,mobile}.png`.
- Local preview remains at `http://127.0.0.1:4321/ideas/email/#idea-9`; dev server running on 4321. The marked preview tab is the user's deliverable; other test tabs closed. Preserve all unrelated report/Footer/HomeSections changes.


Email preview follow-up: option 5 now has a bounded ink sweep on hover and keyboard focus, arrow-to-copy icon transition, drawn success check and a 360ms confirmation bubble after real clipboard success. The pill stays in place. Re-copying replays the bubble. The toast selects above/below placement based on available viewport space, and all visuals retain an instant reduced-motion alternative. Fixed hover/selected icon specificity so the copy/check do not overlap; the idle reduced-motion pill keeps readable contrast. Tested actual copying, keyboard-focus feedback and 320px geometry: pill and active toast fit, no horizontal overflow or console errors. Clipboard restored. Proofs `output/email-idea-5-animated-{desktop,mobile}.png`. Current marked local preview opens `/ideas/email/#idea-5`. Option 9 remains centered with its paper-slip animation. No live contact-page replacement or publication.


### 13 November 2026 — approved option 5 applied to contact

Owner selected option 5 for the actual website. New `src/components/CopyEmail.astro` is now used by both the contact intro and email preview option 5, so approved visuals and behavior share one implementation. Includes ink sweep on hover/focus, arrow/copy/check icons, real clipboard-success confirmation, replayable 360ms toast, viewport-aware above/below placement, reduced-motion alternative and keyboard/status support. Native mailto link is the SSR default, enhanced to Copy only when secure clipboard access exists. If a supported clipboard write fails, a selectable address and email link are revealed. No global animation loop or added dependency.

Removed the old contact letter-pour handler and obsolete `.copy-email`/copy-pour/copy-fade/copy-stamp styles. Contact intro retains a 32px gap before the new control. Existing audit/enquiry form code and data were not changed or submitted. Preview option 5 now imports the same component; the other nine variants remain alternatives.

Verification: Astro check 100 files, 0 errors, 0 warnings, 4 existing hints. GitHub build 18 pages, encrypted quote, existing large lazy-chunk advisory. Static contact HTML includes a native email link and a copy button hidden until enhancement. Real desktop copying and keyboard focus passed; repeated mouse/Enter copies passed at 390px and 320px, no horizontal overflow or console errors. Contact inputs remained blank; no inquiry, audit request or email sent. Browser clipboard restored. Proofs: ignored `output/contact-option-5-{desktop,mobile}.png`. Reduced-motion and clipboard-denial branches inspected in source, not runtime-emulated. Source and `docs/` export ready locally; no commit, push or live deployment. Local contact page shown at `http://127.0.0.1:4321/contact/`; server running on 4321.


### 13 November 2026 — continued Claude’s ten Services previews

Owner asked to find and finish Claude’s interrupted Services design exploration. Found the existing untracked `src/pages/[preview]/services.astro`; retained all ten concepts and five service groups. Original snapshot is in ignored `tmp/services-claude-before.astro.txt`. Preview remains DEV-only/noindex at `/ideas/services/`; no homepage service variation has been selected or applied.

Completed work in `src/pages/[preview]/services.astro` and new `src/scripts/services-preview.ts`:
- Fixed wrapping row arrows and two additional phone overflows (laptop base and phone/tab panel). Inactive image-letter headings stay readable; selected letters have a dark outline. Touch spotlight uses a faint unmasked background and a separate action under the selected service.
- Native accordion/column/spotlight buttons, expanded/hidden/inert states, keyboard tab navigation (arrows/Home/End), correct Support and audit destinations, explicit autoplay controls and a global Pause animations checkbox. Manual tab choices persist instead of immediately advancing. Accordion can close completely. Marquee explains first-tap preview behavior on phones.
- Removed perpetual cursor animation loops: pointer updates run only while moving/settling, visible, foreground and motion-enabled. CSS effects pause offscreen; reduced motion and short landscape views disable sticky/scaling motion. Stack updates batch position reads before writes. No new dependency.

Verification: Astro check 102 files, 0 errors, 0 warnings, 4 existing unrelated hints; scoped layout scan `[]`; diff whitespace check passed. Browser viewport checks at 320, 390, 768, 844 landscape, 1280 and 1440px found no document/demo horizontal overflow. Tested accordion, all five column selections/content fit, keyboard tabs, automatic tab advancement and pause, readable lettering, touch spotlight selection and Support destination, and marquee first tap. Fresh preview console had no errors. Reduced-motion branch inspected in source; no real-device frame-rate or fresh Lighthouse score is claimed. GitHub export built successfully (18 pages, quote encrypted, existing lazy-chunk advisory); the Services preview route is absent from it. Later changes were preview-only. No push or deployment.

Proofs in ignored `output/services-desktop-tabs-final.png`, `services-mobile-letters.png`, `services-mobile-spotlight.png`. Other existing support/email/quote/report/orbital changes are preserved. Next design decision: owner picks a service concept before homepage integration.


### 13 November 2026 — Find my plan popup only

Owner clarified that only the finder should become a popup. Full Basic/Medium/Large comparison and VIP remain inline, immediately after the intro once enhancement moves the finder into its dialog. No small comparison, summary strip, comparison popup, or automatic load popup is present. The estimator’s existing compact comparison component is unchanged.

`src/pages/plans.astro` adds the native dialog and the Find my plan trigger. `src/scripts/support-modal.ts` moves the existing finder into it without duplicating IDs or rebuilding its state. Native Escape/close, backdrop dismissal, page scroll lock, focus return and a fixed header/close control are retained. The Compare link in the result dismisses the dialog and jumps to the full on-page comparison. Existing #fit/#fit-result links and the mobile View result bar open the same dialog, including repeat clicks. Without JavaScript the original finder remains inline. `revealSupportTarget` in `src/scripts/support-finder.ts` scrolls only the modal content when it is present, preventing result/step focus from scrolling the close button away.

Browser checked at 320px, 768px and 1280px: no horizontal overflow; blank-step validation, three-question Medium result, correct estimator plan/answer URL, reset, reopening retained answers, result bar reopening, Escape and focus return, and the on-page comparison link. Normal Tab from the close button advances into the finder. Mobile result keeps the header/close control visible. No inquiries sent or contact details entered. Temporary browser timeouts were resolved with a fresh QA tab. Proofs: ignored `output/plan-finder-popup-{desktop,mobile}.png` and `output/plan-comparison-on-page.png`. No new library or animation loop.

Final checks: Astro 103 files, 0 errors, 0 warnings, 4 existing hints; six support logic tests pass; scoped layout scan `[]`; 18-page GitHub export rebuilt with encrypted quote (existing lazy-chunk advisory). Source and export are local, not pushed or deployed. Dev server restarted on 4321.


### 13 November 2026 — twenty service-card designs and useful right panels

Owner requested compact Basic/20, Medium/40, Large/80 and VIP details, PageSpeed-style categories, migration examples, removal of the in-card 04/05 counters, and 20 more design previews before choosing a homepage design. Work remains local preview only; no homepage variation has been applied.

- `/ideas/service-cards/` (`src/pages/[preview]/service-cards.astro`) provides all twenty fully rendered designs, a swatch index, service selector that changes all twenty, immediate jump selector, hover pause, keyboard controls and reduced-motion behavior. Designs vary background, framing, composition, type, evidence placement and native scope disclosure. Preview labels stay outside the cards for comparison; no in-card ordinal/fraction remains.
- Shared content: `src/data/services-preview.ts` (five existing services/projects), `src/data/service-card-designs.ts` (twenty concepts), `src/scripts/service-cards-preview.ts` (shared card builder/filter), `src/scripts/service-card-media.ts` and `src/styles/service-card-media.css` (right panels).
- Support panel uses current plan capacities/replies, brief service descriptions and real estimator plan links. VIP is 8 hours/day Mon–Fri, with its approved working-hours reply. No prices or extra deliverable promises invented.
- Audit panel has four category rings and keyboard/touch Before/After controls. Values are clearly labelled illustrative, not measured client results. Same red/orange/green score bands as the official Lighthouse scoring reference: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring . Three generic migration examples are selectable (WooCommerce→Shopify, WordPress→Webflow, Magento→Shopify), with short preparation/checking steps. They are not attributed to client projects.
- Original `/ideas/services/` stacking concept 9 now uses the same Support/audit panels; removed all five in-card fractions and added a link to the twenty designs. Earlier concepts retain their original project/stand-in images. Tall Support/audit cards scroll normally on phones so their details remain reachable. Existing pointer/offscreen pause behavior is preserved.
- Owner caught missing gauge numbers in a screenshot during work. The SVG was painting over the text. Fixed with explicit text positioning/stacking and visually verified the original stacking card, Before and After. No result metrics are claimed.

Verification: Astro check 108 files, 0 errors, 0 warnings, 4 existing unrelated hints; scoped layout scan `[]`; whitespace check passes. All twenty support/audit designs checked for geometry at 320, 390, 768 and 1440px (project mode also checked at phone/tablet widths): no document or media-content overflow. The offset-sheet decoration extends intentionally into its reserved 12px margin. Tested service switching, jump control, native scope disclosure via Enter, hover pause, audit state colors/numbers and migration selection. Original stacking panels checked at 1440/320px: no counters, four plan choices, visible numbers, no horizontal overflow or console errors. Reduced motion inspected in source; no actual-device frame-rate or fresh Lighthouse audit claimed.

Proofs in ignored `output/service-card-twenty-designs.png`, `service-card-audit-design.png`, `service-stack-audit-fixed.png`. Both preview routes are DEV-only and noindex. Preserve the completed public support finder popup, inline comparison, orbital and other existing work. No commit/push/deployment performed.

Production build passed: 18 pages, existing lazy-chunk size advisory. Both preview routes are absent from `dist/`; public `docs/` export was not regenerated for this preview-only change. Dev server restarted on 4321.


### 13 November 2026 — centered audit motion and homepage Services replacement

Owner refined the card interaction, then authorized replacing the homepage Services section. The final behavior supersedes the earlier scroll-scrub experiment: the card reaches a centered reading position at Before, waits, and the next separate wheel/swipe/keyboard scroll gesture plays the complete 720ms illustrative Before→After sequence. A wheel-event burst counts as one gesture, so entry momentum does not start the comparison. Before/After buttons remain available (360ms finite transition). Upward gestures reverse the example. No wheel/touch prevention, inertia library, or continuous idle loop; updates are visibility-gated with geometry reads grouped before writes. Tall/mobile cards use normal flow and arm when the score panel is readable near the center. Reduced motion/pause gives a static comparison with working direct controls. No physical-device frame-rate or fresh Lighthouse score is claimed.

- `src/scripts/service-card-motion.ts` owns the centered gate, short native reading hold, finite score/card motion and input intent. The abandoned long 760px scrub and Follow/Scroll linked controls are removed. `src/scripts/service-card-media.ts` owns shared widget markup, cached gauge painting, progress values, platform choices and migration steps. Progress now has endpoint labels, percentage, a bounded moving marker and completion colour. The marker is clipped within its track to avoid mobile overflow.
- Migration section now shows existing/new platforms, route-specific copy, and a three-step rail (Plan / Move / Check & launch). On narrow phones the platform names stack instead of splitting awkwardly. All figures stay clearly labelled illustrative and are not presented as measured client outcomes.
- Faint oversized service-name backgrounds now appear on all twenty card designs and all five original stacking cards, beneath the content. Fraction counters remain removed. Preview pause label is now Pause motion. Switching services clears/recreates motion scenes without duplicated wrappers and retains the current design context.
- New public `src/components/ServicesStack.astro`, `src/styles/services-stack.css`, `src/scripts/services-stack.ts` replace only the old homepage service rows through `HomeSections.astro`. The five services, cards, compact plans and audit/migration example share the media/controller above. Hero/orbital files were not edited. Project images link to case studies and retain known company/agency attribution; Teamtown remains Company project without an invented agency.
- Public content is now `src/data/services.ts`; `services-preview.ts` is a compatibility re-export so previews stay aligned. Without JavaScript, complete server-rendered service content and a static illustrative After example remain readable; inactive widget controls are shown only after enhancement. Real CTAs and case-study links remain native links.
- `DESIGN.md` records the owner-selected service-card canvas colours as a departure from the otherwise monochrome page.

Verification: final Astro check 112 files, 0 errors, 0 warnings, 4 existing unrelated hints. Scoped layout scan `[]`; whitespace check passes. Native browser input verified entry at 0%, centered hold (preview top220 at1100px height), then a separate small scroll reaches100% with the card still at220. Homepage independently verified centered top138 at900px height, 0% while waiting and100% after the next gesture. Manual controls, reverse scrolling, route changes, all20 watermarks, all5 original/homepage watermarks, filter scene cleanup and pause were checked. At320/390px all five public cards and both widgets fit their containers; no service-section horizontal overflow, and tall cards do not pin. The document still measures the pre-existing full-bleed marquee's 8px desktop overhang, clipped by the existing body rule; this change did not alter it. Browser console had no errors in final interaction checks.

GitHub export rebuilt:18 pages, quote remains encrypted; existing large lazy-chunk advisory. Public homepage contains five cards, GitHub-base case-study links and explicit illustrative-score copy, with no /ideas/ links or Scroll linked label. Both local preview routes remain absent from the export. Source and `docs/` are ready locally; no commit, push or deployment was performed. Dev server restarted on4321.

Proofs in ignored `output/service-centered-before.png`, `service-centered-after.png`, `home-services-centered-after.png`. Earlier middle/scrub screenshots predate the final behavior and should not be used as the current design reference. Future changes to shared card media or motion must be checked on the homepage as well as the previews.


### 13 November 2026 — mobile stack, smaller cards/buttons and roomier support rows

Owner then requested stacking on phones, a more compact migration/SEO card, smaller fonts/buttons, and relief from the squeezed two-column support summary. These updates supersede the earlier mobile normal-flow and two-column summary notes above.

- New `src/scripts/stack-layout.ts` is shared by the public stack and original preview9. It measures card heights only on resize/content-height changes and sets a mobile sticky top. Cards that fit use a small layered offset; tall cards use a negative top so their content scrolls through before they settle above the fixed bottom controls. No extra mobile scroll animation loop. Short landscape/reduced-motion fallbacks remain normal flow. Public desktop shrink scheduling now runs only on the wide-screen branch; the original preview likewise skips the shrink loop on phones.
- Mobile service headings26px, body13px, CTA12px, 44px minimum tap area and reduced padding. All five service CTAs fit on one line at320px. The fixed estimate button and navigation circle remain49px high and aligned.
- Shared support widget uses one full-width row per plan on phones: capacity on the left, plan/purpose/reply on the right. Brief mobile summaries avoid narrow word-by-word columns. Desktop comparison remains two columns; public support-plan page content/inclusions were not shortened.
- Migration widget is tighter on mobile: smaller rings/header, compact platform flow, three horizontal phase labels, and a native Migration details disclosure containing the alternative routes and full explanation. Closed by default on phones; open on desktop. Enter/Space and all three choices still work. Optional mobile service descriptions live in shared `src/data/services.ts`; full desktop copy remains present. Score disclaimer is now “Example scores, not measured client results.”
- At390×844, support card reduced from930px to711px and migration card from1400px to795px. At320×740, support740px and migration824px; all five CTAs44px and no card/widget horizontal overflow. Full-width plan rows were verified, as were disclosure open/close with Enter and all three route options. At390px the tall plan footer ended at716px, the incoming card began at778px and fixed CTA began at781px: the plan details can be read before overlap. No console errors in these checks.
- Astro check113files:0errors,0warnings,4existing hints; scoped layout scan `[]`; whitespace check passes. Final GitHub export rebuilt18pages with encrypted quote and existing lazy-chunk advisory. No push/deployment. Source/export local; development server restarted4321.

Proofs: ignored `output/home-mobile-stack-320.png` (overlapping first two service cards), `home-mobile-stack.png` (tall-card clearance). Final compact support proof is saved separately after refreshing the built version. No physical-device FPS measurement or new Lighthouse score is claimed.
