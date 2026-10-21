# common/ui/star-rating

`star-rating`: a five-star rating input, also usable read-only.

A tap rates directly; a drag across the row previews the rating and commits it
when the pointer lifts. Each change of the shown value plays the `tick` haptic
once and pops the star (issue #1748). See `Haptic Feedback Rule` in
`ssot/architecture/capacitor.md`.

## Running unit tests

Run `nx test common/ui/star-rating` to execute the unit tests.
