# Implementation - Brand Characters

## Purpose

The character set owns what the BiteTribe tribe is, where the artwork lives, and
how a character SVG was produced.

It exists because the set was created as raster renders in a local design folder,
where nothing recorded which variants were current or that they were derived from
the logo rather than drawn beside it.

[[Implementation - Store Listing Assets]] owns the store identity and the listing
artwork. This page owns the character artwork itself.

Filed as
[issue #1482](https://github.com/muhammedgaygisiz/travellers-apps/issues/1482).

## The Set

Every character is the same bitten cookie wearing a different piece of cultural
headwear. **The shipped logo is one of them, not the mark the others were derived
from** - it wears a feathered headdress - which is why the Storybook showcase
renders it in the line-up rather than above it.

| Character | File                                        | Headwear                  |
| --------- | ------------------------------------------- | ------------------------- |
| BiteTribe | `apps/bite-tribe/src/assets/icons/logo.svg` | feathered headdress       |
| Viking    | `ssot/assets/characters/01-viking.svg`      | horned helmet             |
| Arab      | `ssot/assets/characters/02-arab.svg`        | keffiyeh and agal         |
| Ethiopian | `ssot/assets/characters/03-ethiopian.svg`   | striped headband          |
| Turk      | `ssot/assets/characters/04-turk.svg`        | fez                       |
| Chinese   | `ssot/assets/characters/05-chinese.svg`     | hair buns                 |
| Japanese  | `ssot/assets/characters/06-japanese.svg`    | kabuto                    |
| Swiss     | `ssot/assets/characters/07-swiss.svg`       | alpine hat with edelweiss |

The names are the design export's and mix a historical term with national ones.
A product vocabulary has not been decided, so nothing in the repository should
treat these as user-facing labels. See [[Current State - Open Questions]].

### The Logo Is In An Older Palette

The set is not yet colour-consistent, and the Storybook page is where that shows.

| Role    | Logo      | The seven |
| ------- | --------- | --------- |
| Outline | `#55422A` | `#402810` |
| Cookie  | `#F0B967` | `#F8B850` |
| Shade   | `#CE8B3D` | `#C88028` |

The seven carry a darker outline over a more saturated cookie. Whether the logo
is re-cut to match or the set is pulled back toward the logo is a brand decision
that has not been taken, and it is the reason the logo is rendered beside them
rather than trusted as the reference.

## Where The Artwork Lives

The characters are versioned under `ssot/assets/characters/`, beside the
store-listing and social assets, **not** in an app's asset folder.

This is deliberate and depends on a fact that is true today: nothing in the
product references a character. Angular's asset glob copies a whole assets
folder into every build, so placing them next to `logo.svg` would ship roughly
320 KB into all three apps to serve nothing.

**When a surface actually uses a character, the file moves to
`apps/bite-tribe/src/assets/` and this page is updated.** Do not copy it - two
copies of brand artwork drift.

The logo is the exception already: it ships, because the apps render it.

## How A Character SVG Was Produced

The committed SVGs are **traced from the approved renders, not re-drawn**. The
design pass produced 1254x1254 raster images; those pixels are the approved
artwork, so a hand-rebuilt vector would have been a new design wearing the same
description.

Method, in the order it has to run:

1. Denoise the render with a 3x3 median filter and posterise each channel to
   5 bits. The renders carry compression noise, which otherwise becomes hundreds
   of near-identical colours and, after tracing, thousands of path segments.
2. Cluster the colours **in CIE L\*a\*b\***, seeding a cluster from the most
   frequent colour that is at least 10 CIE76 units from every seed taken so far.
3. Flood-fill the canvas colour inward from the four corners and drop it, so the
   background is transparent while an interior white - a keffiyeh, a horn, a hat
   band - survives as a filled shape.
4. Trace each colour as its own layer with
   `potrace --svg -a 1.3 -O 0.8 -t 16 -u 10`, largest area first, the outline
   colour last.
5. Grow every layer below the outline by one pixel, so smoothing cannot open a
   seam between two adjacent fills.
6. Optimise with `svgo`, keeping `viewBox` and one decimal of precision.

### Two Rules That Are Not Obvious

**Cluster in Lab, not RGB.** RGB distance collapses dark hues: the Swiss hat's
dark green and the outline brown are 61 units apart in RGB, close enough to merge
at any threshold loose enough to absorb compression noise. The hat came out
brown. In Lab the same pair is far apart while the noise is not.

**Seed clusters by frequency, not by volume.** Median-cut quantisation allocates
buckets by how much of the image a colour covers, so it spends its buckets on the
cookie and drops the small saturated details - the Ethiopian headband's green and
red stripes, the red in the Swiss hat band - into their neighbours. Frequency
seeding with a perceptual separation keeps a colour that covers 0.07% of the
image if no similar colour has been taken.

### Fidelity

Each SVG was rendered back to 1254x1254 and compared to its source render:
mean per-channel difference is 2-3 of 255, and fewer than 0.6% of pixels differ
by more than 60. That residue is antialiased raster edges becoming crisp vector
edges, which is the intended difference.

Repeat the check before replacing a character, rather than reviewing the SVG by
eye - a merged colour looks like a design choice at thumbnail size.

**The tracing script is not in this repository.** It is Python, depends on
`potrace` and Pillow, and `tools/` is Node. It lives with the design source. The
parameters above are the reproducible part; a re-run needs the script recovered
or rewritten from them.

## What The Files Contain

Real vector paths, one group per flat colour, on a transparent 1254x1254 canvas.

An earlier export wrapped the raster in an `<image>` element inside an `<svg>`
wrapper. Those files are 1.5 MB each, do not scale, and are **not** what is
committed here. If a character ever grows past ~100 KB, check for an embedded
raster before accepting it.

## Storybook

`apps/storybook-host/src/app/characters/characters.stories.ts` renders the whole
set on one page, as `Brand/Characters`.

Storybook reaches the artwork through a third `staticDirs` entry in
`apps/storybook-host/.storybook/main.ts`, mapping `ssot/assets/characters/` to
`/assets/characters/`. The logo comes from the app assets entry that already
exists.

This is the only consumer of the SSOT folder, and it is a documentation surface
rather than a shipped one, which is what makes serving SSOT material from it
acceptable.

Loki captures the page like any other story, so a character that fails to load
fails the visual job rather than rendering as a silent gap - `fetchFailIgnore` in
`loki.config.js` ignores third-party hosts only. See [[Implementation - Storybook]].
