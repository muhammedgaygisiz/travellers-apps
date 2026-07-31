# Intro Story prototypes

Storybook-first exploration of BiteTribe onboarding narrative beats
(**Find → Share → Tribe → Go**) using real app screens, synced soft-dot
gestures, progressive disclosure coach-marks, and intentional flow variants.

## Storybook hierarchy

`Prototypes/Intro Story/` (sorted first via storybook-host preview):

| Path                         | What it is                                  |
| ---------------------------- | ------------------------------------------- |
| **A Icons Only**             | Abstract icons baseline                     |
| **B Real UI Story Beats**    | Stories chrome + single-beat real UI        |
| **B … / Beats**              | Discover / Share / Tribe / Go gesture loops |
| **C Real UI Swipe**          | Swipe / Continue chrome                     |
| **D Real UI Chapters**       | Chapter wizard chrome                       |
| **E Progressive Disclosure** | One tip at a time over real UI              |
| **Flows / Find the bite**    | 10 intentional Find variants                |
| **Flows / Share the find**   | 10 intentional Share variants               |
| **Flows / Join the tribe**   | 10 intentional Tribe variants               |
| **Flows / Ready to taste?**  | 10 intentional Go variants                  |
| **Compare**                  | Side-by-side A–D chrome switcher            |
| **\_Archive / Fake UI Sim**  | Legacy fake-UI track                        |

Canonical Discover contract: scroll + open the **same** Botanic Breeze card
(`data-bite-id="bite1"`) via `SyncedGestureController` — do not regress.

## Architecture (short)

```text
gesture/          SyncedGestureController + iPhone shell + soft-dot
source-real-ui/   Real Home / Create / Details / Profile / Map stage
variant-e-…/      Progressive tip tour over the real stage
flows/            40 intentional gesture scripts × Storybook stories
```

## Local Storybook

```bash
npm run storybook
# http://localhost:4400
```

Useful story URLs (after Storybook is up):

- Beats Discover: `/?path=/story/prototypes-intro-story-b-real-ui-story-beats-beats--discover-home-feed`
- E Interactive: `/?path=/story/prototypes-intro-story-e-progressive-disclosure--interactive`
- Flows Find scroll: `/?path=/story/prototypes-intro-story-flows-find-the-bite--scroll-to-card-then-open`
- Flows Go pin: `/?path=/story/prototypes-intro-story-flows-ready-to-taste--map-pin-drawer-directions`

Optional Remotion video authoring (dev-only, not in the app bundle):

```bash
npm run intro-story:studio
npm run intro-story:render
```
