# common-ui-coach-mark

Presentational coach-mark overlay: a spotlight over an anchor element plus an
explanation card with an explicit dismiss action. Visible text is supplied
through inputs, so the component stays app- and translation-agnostic.

The per-user "seen" bookkeeping and the smart wrapper that decides when to show
a mark live in `bite-tribe/coach-mark`, not here.

## Running unit tests

Run `nx test common-ui-coach-mark` to execute the unit tests via Jest.
