---
name: release-story
description: Create the @bitetribeapp "New in v<version>" release announcement as one Instagram Story image (1080x1920). It takes a marketing version, defaulting to the one in package.json, finds what shipped since the previous version from the release tags, has the user approve a two-line headline and five highlights, and renders them into the fixed release-story layout with the mascot, a version badge and the "Update now" call to action. Use when the user asks for a release announcement, a release story, or a "what's new" image for a version, e.g. "/release-story 1.2.0".
argument-hint: [version]
---

# Release Story

The release announcement for a marketing version: one Instagram Story with the
mascot and two brand characters on top, a **New in vX.Y.Z** badge, a two-line
headline, five highlight cards and the **Update now** call to action. The 1.1.0
story set the layout, and [reference-1.1.0.png](reference-1.1.0.png) is what it
looks like. The format is recorded in
[Marketing - Social Media Channels](../../ssot/marketing/social-media-channels.md#the-release-stories);
this skill is how an agent produces one.

**The layout is fixed. Only the words change.** The renderer owns every size,
colour and position. A story for a new version changes the version, the headline,
the five highlights and, if wanted, the two characters, and nothing else. If the
layout itself should change, change [scripts/render.mjs](scripts/render.mjs) and
the SSOT section together, and re-render the reference.

All paths are relative to the repository root. Run commands from there.

## Input: One Version

- If a version came with the request (`/release-story 1.2.0`), use it.
- If not, use `version` from `package.json`, and say which version you took.
  Do not ask.

## Workflow

### 1. Find what shipped

Release tags are named `build-<version>-<build>`
([Release Workflow](../../ssot/overview/release-workflow.md)). The story covers
what is new in the version, from the newest tag of an earlier version to the
newest tag of this one:

```bash
git fetch --tags
git for-each-ref --sort=creatordate --format='%(refname:short) %(creatordate:short)' refs/tags | tail -20
git log --no-merges --format='%h %s' <newest earlier-version tag>..<newest tag of this version>
```

- **If the version has no tag yet**, because the story goes out ahead of the
  store release, end the range at `HEAD` instead. Say so in the report. 1.1.0
  was announced like this, and it never got a tag of its own: its first build
  shipped as `build-1.1.1-99`.
- `CHANGELOG.md` lists the same commits under `### Features` for each build, if
  it is easier to read.

### 2. Pick five highlights and a headline

Read the `feat` commits, and the `fix` commits a user would notice. Then pick
**exactly five** highlights. The layout holds five cards; four leaves a gap,
and six runs into the button.

- **Only what a BiteTribe app user sees.** Leave out `bite-tribe-admin`,
  `bite-tribe-business`, `functions` that change nothing visible, analytics,
  tests, docs and dependency bumps.
- **One card can hold several commits.** The 1.1.0 "Celebrate your firsts"
  card covers six commits, one per milestone.
- **Check every claim against the code**, the way the other posts on the
  channel page do. A highlight names what the app does now, not what an issue
  planned.
- **Address the reader without grammatical gender**, as the locales do.
- **Write the product as BiteTribe**, one word, and Bite and BiteTrail as the
  app does.

Each highlight is an icon, a title and one line of text:

| Field   | Rule                                                                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | About 26 characters at most, so it stays on one line                                                                                                                                      |
| `text`  | About 56 characters at most, so it stays on one line                                                                                                                                      |
| `icon`  | One of `instagram`, `celebrate`, `globe`, `hand`, `people`, `language`, `pin`, `map`, `star`, `bookmark`, `bell`, `shield`, `camera`, `search`, `qr`, `sparkles`, `desktop`               |
| `tone`  | Optional: `gold`, `ember` or `blue`. Left out, the cards go gold, ember, blue, gold, blue, as in 1.1.0. Set it only to keep two neighbouring cards apart, never to colour-code a meaning. |

The headline is two short lines; the second is drawn in gold. Each line holds
about 12 characters at this size. Write it about this version: 1.1.0 was
**Share it. / Celebrate it.**, after its two biggest features, and an echo of the
brand line _Find it. Try it. Share it._ Do not reuse an earlier headline.

`characters` optionally swaps the two characters beside the mascot. Use file
names from `ssot/marketing/assets/characters/` without `.svg`, left first; the
default is `01-viking` and `06-japanese`. Vary them between versions.

### 3. Gate: the user approves the words

Show the headline and the five highlights as a short list, with the commits
each card stands for. Wait for approval before you render. Changing words after a
render is cheap, but a wrong claim that gets approved because it looks finished
is not.

### 4. Render

Write the config to a working folder in the scratchpad, shaped like
[scripts/example-1.1.0.json](scripts/example-1.1.0.json), then:

```bash
node skills/release-story/scripts/render.mjs <work>/config.json <work>/release-<version>-story.png
```

It needs the installed Chrome (`channel: 'chrome'`) and the Outfit font from
Google Fonts. It fails on anything other than five highlights or two headline
lines, and on an unknown icon. It **warns** when the cards end too close to the
button, which means a title or text wrapped onto a second line; shorten it and
render again rather than shipping a warning.

Look at the image at full size. Check for:

- a card whose text wrapped, even without the warning;
- the headline running to a third line;
- anything in the top 140 or bottom 215 pixels other than confetti. Instagram
  draws the profile bar and the reply field there.

### 5. Gate: the user reviews the image

Send the PNG and wait for approval or changes. Re-render after every change.

## After Approval

- **Copy the approved image into the repository only when the user asks** for
  it. Published post images live in `ssot/marketing/assets/social/`, named
  `release-<version>-story.png`.
- **Publishing is a separate step.** This skill makes the image. A story allows
  one link sticker; choose its URL by
  [The One Download Link](../../ssot/marketing/social-media-channels.md#the-one-download-link-done)
  and [Campaign Tags On Every Link](../../ssot/marketing/social-media-channels.md#campaign-tags-on-every-link).
- Report the version, the commit range and whether it ended at a tag or at
  `HEAD`, the headline, the five highlights with the commits behind each, and the
  path of the image.
- If the story went up, add it to `## The Release Stories` in
  `ssot/marketing/social-media-channels.md`.
