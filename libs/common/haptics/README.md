# haptics

`HapticsService` — the single way either app plays haptic feedback.

It exposes exactly eight named intents (`press`, `release`, `tick`,
`selection`, `confirm`, `warning`, `success`, `error`), each played through the
method of the same name on `BiteHaptics`, the local Capacitor plugin in the
bite-tribe native wrappers. A build without that plugin falls back to one
`@capacitor/haptics` call per intent. There is no raw `vibrate({ duration })`
passthrough. Every intent is a no-op off a native
build and never rejects, so a call site can fire and forget it.

`enabled` and `setEnabled()` switch every intent off for the device. The
choice is kept in `Preferences` under `haptics-enabled` and defaults to on;
only bite-tribe's settings page exposes a control for it.

See `Architecture - Capacitor` in the SSOT for the vocabulary, and GitHub epics
#1633 and #1740 for the call sites it serves.
