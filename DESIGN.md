# Grant Payad design system

## Direction
Close adaptation of Studio Design's Parker portfolio. Black type on white, condensed display headings, generous margins, hairline rules with dot terminals, and large real project screenshots. Williams informs the oversized name in the closing section.

## Scene
A prospective collaborator browses Grant's work on a laptop in a bright office, looking for a clear sense of technical skill and visual care.

## Typography
Big Shoulders Display, weight 800, for major display headings. Archivo variable for body text and navigation. Both are self-hosted open-source fonts. Large display scale intentionally follows the user's reference. Heading tracking never tighter than -0.04em.

## Color
User-requested monochrome takes precedence over the generated palette seed. Background oklch(1 0 0), ink oklch(0.16 0 0), muted oklch(0.47 0 0), rule oklch(0.83 0 0), project canvas oklch(0.95 0 0). Project imagery supplies color.

## Layout
Maximum content width 1600px, fluid 24-64px side gutters. Asymmetric half-width introduction. Two-column project grid with full-width feature. Mobile stacks sections and project metadata. Distinct editorial project frames rather than icon cards.

## Motion
Short menu and hover transitions; no scroll hijacking, cursor replacement, or hidden content awaiting a reveal. Reduced motion removes transforms and smooth scrolling.

## Components
Round accessible menu button, native dialog navigation, terminal-dot section rules, screenshot project frames, stacked service cards with oversized background service names, large contact footer. Keyboard focus is always visible.


## Services update — 13 November 2026
The owner selected the developed stacked-card direction for the homepage Services section. Its soft project-canvas colours are an approved departure from the otherwise monochrome page. Cards carry a faint oversized service name; project previews preserve company/agency attribution. Support uses a compact 20/40/80-hour and VIP summary. The migration card shows explicitly illustrative audit values and migration routes. On larger screens it reaches a centered reading position at Before; the next separate scroll gesture plays a finite transition. Phone cards stack with height-aware sticky offsets; taller cards finish scrolling their content before joining the stack. Short landscape screens and reduced motion retain normal flow. Before/After buttons and reduced-motion/static fallbacks remain available. Native scrolling is never intercepted.

Mobile refinement: service headings are26px, body copy13px and compact CTA labels12px with44px tap areas. Support summaries become full-width capacity/detail rows. The audit widget retains all four categories but collapses migration route choices and explanatory copy into native Migration details; the core platform flow and three phase labels stay visible. Desktop typography and the full comparison remain unchanged.
