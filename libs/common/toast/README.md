# toast

`ToastService` — the single way either app raises a toast.

It owns position, colour, duration and the translation lookup, so those are
decided once rather than at each call site. `outcome` is a required input, which
is what keeps a failure from rendering like a success.

See `Implementation - Ionic Patterns` in the SSOT for the reasoning, and GitHub
issue #1305 for the defect it fixes.
