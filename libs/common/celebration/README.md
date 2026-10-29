# celebration

`CelebrationService` — the single way bite-tribe celebrates a moment.

`celebrate(moment)` draws one short `canvas-confetti` burst from the bottom of
the screen on a full-viewport canvas that takes no pointer events, and presents
the moment's own success toast through `ToastService`, which plays the
`success` haptic. The confetti plays no haptic of its own. Under
`prefers-reduced-motion: reduce` no confetti is drawn, a burst never stacks on a
running one, and the call never rejects.

This is the only library that imports `canvas-confetti`. Only bite-tribe calls
it.

See `Implementation - Ionic Patterns` → `Celebration Rule` in the SSOT, and
GitHub epic #1741 for the moments it serves.
