# sounds

`SoundsService` — the single way bite-tribe plays a sound.

It exposes exactly two named intents, `posted` and `celebration`, each played
through the method of the same name on `BiteSounds`, the local Capacitor plugin
in the bite-tribe native wrappers. That plugin plays the bundled file through
the platform's own UI-sound path - System Sound Services on iOS, a `SoundPool`
on the system stream on Android - so a sound mixes with the user's music and
stays quiet in silent mode. There is no `play(file)` passthrough and no
`@capacitor/*` fallback: a build without the plugin is silent.

Every intent is a no-op off a native build, drops a play that starts while the
previous sound is still playing, and never rejects, so a call site can fire and
forget it.

`enabled` and `setEnabled()` switch every intent off for the device. The
choice is kept in `Preferences` under `sounds-enabled` and defaults to on.

See `Sound Rule` in `Architecture - Capacitor` in the SSOT, and GitHub epic
#1742 for the call sites it serves.
