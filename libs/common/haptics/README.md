# haptics

`HapticsService` — the single way either app plays haptic feedback.

It exposes exactly five named intents (`selection`, `confirm`, `warning`,
`success`, `error`), each mapped to one `@capacitor/haptics` call. There is no
raw `vibrate({ duration })` passthrough. Every intent is a no-op off a native
build and never rejects, so a call site can fire and forget it.

See `Architecture - Capacitor` in the SSOT for the vocabulary, and GitHub epic
#1633 for the call sites it serves.
