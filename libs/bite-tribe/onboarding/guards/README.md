# bite-tribe/onboarding-guards

Route guards for the onboarding entry gate.

These live apart from `bite-tribe/onboarding` (the assistant itself) on purpose.
Guards must be imported statically to build the route config, while the
assistant has to stay lazily loaded — it pulls in the profile image upload chain
(image compression, cropper, EXIF), which would otherwise sit in the initial
bundle for a flow each user only sees once. Nx also forbids statically importing
a lazily loaded library, so the two cannot share one entry point.

Keep this library free of any dependency on `bite-tribe/onboarding`.
