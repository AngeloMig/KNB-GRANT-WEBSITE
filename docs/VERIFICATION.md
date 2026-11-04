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
