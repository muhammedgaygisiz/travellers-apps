# bite-tribe/dietary-vote

Confirming or disputing a dietary label (GitHub issue #2197), shared by the
Bite details page and the consumer menu. It owns:

- `DietaryVotePromptService` - asks the diner to confirm or dispute a label,
  for a dispute the reason from the fixed list and an optional note, and says
  what came of the vote, the reason an ineligible account was refused
  included.
- `DietaryLabelVotesComponent` (`bt-dietary-label-votes`) - the counts under a
  label, and the diner's own vote.

It holds no data: the counts and the call come from the page's data access.

## Running unit tests

Run `nx test bite-tribe/dietary-vote` to execute the unit tests via Jest.
