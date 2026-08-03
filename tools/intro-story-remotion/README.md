# Intro Story Remotion (DEV-ONLY)

Remotion is **not** part of the BiteTribe production bundle. This package only
authors and renders intro videos that get committed under:

`apps/bite-tribe/src/assets/intro-story/*.webm`

The Angular/Ionic app (and Storybook consumer variants) **play** those files.

## Pipeline

```text
Storybook real UI SOURCE beats
  Prototypes/Intro Story/B Real UI Story Beats
  (gesture scripts in libs/.../intro-story/gesture/beat-scripts.ts)
        │
        │  Remotion does NOT pixel-capture Angular.
        │  Compositions are stylized fake-UI that mirror current
        │  narrative beats, captions, and resolve moments.
        ▼
Remotion fake-UI compositions
  tools/intro-story-remotion
        │  npm run render  (or root: npm run intro-story:render)
        ▼
Packaged videos
  apps/bite-tribe/src/assets/intro-story/{discover,share,tribe,go}.webm
```

## Beat sync (current)

| Composition      | Narrative (matches INTRO_STORY_SCENES + beat scripts) |
| ---------------- | ----------------------------------------------------- |
| `FakeUiDiscover` | Feed → scroll Botanic Breeze → card settle            |
| `FakeUiShare`    | Create → photo → publish → thumbs-up / spark cheer    |
| `FakeUiTribe`    | Explorer profile → Follow → Following toast           |
| `FakeUiGo`       | Map pin → drawer → Directions                         |

**Limit:** Full Remotion sync to live Angular UI is not implemented. Prefer
fresher stylized beats over stale leftover videos. Re-render after composition
or caption changes.

## Commands

```bash
cd tools/intro-story-remotion
npm install
npm run studio    # preview / polish timing
npm run render    # write webms into app assets
```

## Polish notes

- Prefer `spring({ delay, durationInFrames, config: { damping: 200 } })` for UI settles
- Joyful pops: lower damping (~12–16), slightly higher stiffness
- Always `extrapolateLeft/Right: 'clamp'` on `interpolate`
- Soft end fade so beats don't hard-cut
- Keep beats ~3–4s — no dead air
