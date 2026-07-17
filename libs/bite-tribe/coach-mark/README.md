# bite-tribe/coach-mark

Feature coach marks for Bite Tribe. It owns:

- `CoachMarkStateService` — per-user "seen" bookkeeping in device Preferences,
  tracked separately from the onboarding completion flag.
- `CoachMarkComponent` (`bt-coach-mark`) — the smart wrapper each surface drops
  in. On first visit it resolves the copy, measures the anchor, and shows the
  shared overlay from `common/ui/coach-mark`; on dismissal it records the mark
  as seen so it never returns.

## Running unit tests

Run `nx test bite-tribe/coach-mark` to execute the unit tests via Jest.
