# Intro Story Remotion (DEV-ONLY)

Remotion is **not** part of the BiteTribe production bundle. This package only
authors and renders intro videos that get committed under:

`apps/bite-tribe/src/assets/intro-story/*.webm`

The Angular/Ionic app (and Storybook consumer variants) **play** those files.

## Pipeline

```text
Storybook real UI SOURCE beats
  Prototypes/Intro Story/1 Source Real UI
        │
        │  (future: Playwright / Remotion capture of iframe)
        ▼
Remotion fake-UI compositions  ← YOU ARE HERE (Track 2)
  tools/intro-story-remotion
        │  npm run render
        ▼
Packaged videos
  apps/bite-tribe/src/assets/intro-story/{discover,share,tribe,go}.webm
        │
        ▼
Storybook / app CONSUMER
  Prototypes/Intro Story/3 Consumer Video *
```

## Commands

```bash
cd tools/intro-story-remotion
npm install
npm run studio    # preview / polish timing
npm run render    # write webms into app assets
```

## Polish notes (from Remotion docs)

- Prefer `spring({ delay, durationInFrames, config: { damping: 200 } })` for UI settles
- Joyful pops: lower damping (~12–16), slightly higher stiffness
- Always `extrapolateLeft/Right: 'clamp'` on `interpolate`
- Separate CSS `scale` / `translate` / `rotate` props (Studio-editable)
- Soft end fade so beats don't hard-cut
- Keep beats ~3–4s — no dead air
