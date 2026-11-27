import {
  dietaryLabelsOf,
  isDietaryLabel,
  type DietaryLabel,
} from './dietary-label';

/**
 * Diners confirming or disputing a dietary label (GitHub issue #2197, epic
 * #2193).
 *
 * A label is voted on where it is claimed: a creator's label on their Bite, or
 * a restaurant's label on one of its menu items. The votes and the counts are
 * kept server-side by `voteDietaryLabel`, and no client writes either
 * (`UC - Find Dishes That Fit A Dietary Choice` `R-5`).
 *
 * The constants here are repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/dietary/dietary-votes.ts`,
 * because the Functions project cannot reach a library;
 * `dietary-votes-parity.spec.ts` keeps the two equal.
 */

export const DIETARY_VOTES = ['confirm', 'dispute'] as const;

export type DietaryVote = (typeof DIETARY_VOTES)[number];

/** Why a diner disputes a label, from a fixed list. */
export const DIETARY_DISPUTE_REASONS = [
  'animal-product',
  'gluten',
  'staff-said-not',
  'got-sick',
  'other',
] as const;

export type DietaryDisputeReason = (typeof DIETARY_DISPUTE_REASONS)[number];

/** The longest optional note a diner may add to a vote. */
export const MAX_DIETARY_VOTE_NOTE_LENGTH = 280;

/**
 * How many confirmations, with no dispute at all, turn a label into
 * "reported by diners" (settled for #2197 in `Current State - Open Questions`).
 */
export const DIETARY_DINER_REPORT_THRESHOLD = 3;

/**
 * Labels diners alone never turn into "reported by diners": only once the
 * restaurant has declared them. Their votes are still counted and shown.
 */
export const DIETARY_LABELS_REPORTED_ONLY_WITH_RESTAURANT: readonly DietaryLabel[] =
  ['halal', 'kosher'];

/** How long an account must exist before it may vote, in days. */
export const DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS = 14;

/** What is voted on: a creator's labels on a Bite, or a menu item's. */
export type DietaryVoteTarget =
  | { type: 'bite'; biteId: string }
  | { type: 'menuItem'; restaurantId: string; menuItemId: string };

export interface DietaryLabelTally {
  confirm: number;
  dispute: number;
}

/** The counts for one Bite or one menu item, by label. */
export type DietaryLabelTallies = Partial<
  Record<DietaryLabel, DietaryLabelTally>
>;

/** The caller's own votes on one Bite or one menu item, by label. */
export type DietaryOwnVotes = Partial<Record<DietaryLabel, DietaryVote>>;

/** Why `voteDietaryLabel` refused the caller, shown to them as it is. */
export const DIETARY_VOTE_INELIGIBLE_REASONS = [
  'own-bite',
  'restaurant-holder',
  'account-too-new',
  'no-own-bite',
] as const;

export type DietaryVoteIneligibleReason =
  (typeof DIETARY_VOTE_INELIGIBLE_REASONS)[number];

export type VoteDietaryLabelResult =
  | { status: 'saved'; tally: DietaryLabelTally }
  | { status: 'ineligible'; reason: DietaryVoteIneligibleReason }
  | { status: 'refused'; field: 'note' };

export interface VoteDietaryLabelRequest {
  target: DietaryVoteTarget;
  label: DietaryLabel;
  vote: DietaryVote;
  reason?: DietaryDisputeReason;
  note?: string;
}

/**
 * The document holding a target's counts, and the caller's votes beside it.
 * A Bite has one of each; a restaurant's whole menu shares one, keyed inside
 * by menu item, so a menu costs two reads rather than two per dish.
 */
export const dietaryVoteScopeKey = (target: DietaryVoteTarget): string =>
  target.type === 'bite'
    ? `bite__${target.biteId}`
    : `menu__${target.restaurantId}`;

/** The key of one target inside its scope document. */
export const dietaryVoteSubjectId = (target: DietaryVoteTarget): string =>
  target.type === 'bite' ? target.biteId : target.menuItemId;

/** The caller's vote document in a scope. */
export const dietaryOwnVotesId = (scopeKey: string, uid: string): string =>
  `${scopeKey}__${uid}`;

const countOf = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;

/**
 * Stored counts as readers see them: known labels only, whole non-negative
 * numbers, and a label nobody voted on left out.
 */
export const dietaryLabelTalliesOf = (value: unknown): DietaryLabelTallies => {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  const tallies: DietaryLabelTallies = {};

  Object.entries(value as Record<string, unknown>).forEach(([label, raw]) => {
    if (!isDietaryLabel(label) || typeof raw !== 'object' || raw === null) {
      return;
    }

    const confirm = countOf((raw as Record<string, unknown>)['confirm']);
    const dispute = countOf((raw as Record<string, unknown>)['dispute']);

    if (confirm || dispute) {
      tallies[label] = { confirm, dispute };
    }
  });

  return tallies;
};

/** The counts of every subject in a scope document, by subject id. */
export const dietaryScopeTalliesOf = (
  data: unknown,
): Record<string, DietaryLabelTallies> => {
  const items = (data as { items?: unknown } | undefined)?.items;

  if (typeof items !== 'object' || items === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(items as Record<string, unknown>).map(([id, tallies]) => [
      id,
      dietaryLabelTalliesOf(tallies),
    ]),
  );
};

/** The caller's votes on every subject in a scope, by subject id. */
export const dietaryScopeOwnVotesOf = (
  data: unknown,
): Record<string, DietaryOwnVotes> => {
  const items = (data as { items?: unknown } | undefined)?.items;

  if (typeof items !== 'object' || items === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(items as Record<string, unknown>).map(([id, labels]) => {
      const votes: DietaryOwnVotes = {};

      if (typeof labels === 'object' && labels !== null) {
        Object.entries(labels as Record<string, unknown>).forEach(
          ([label, entry]) => {
            const vote = (entry as { vote?: unknown } | null)?.vote;

            if (
              isDietaryLabel(label) &&
              (DIETARY_VOTES as readonly unknown[]).includes(vote)
            ) {
              votes[label] = vote as DietaryVote;
            }
          },
        );
      }

      return [id, votes];
    }),
  );
};

/**
 * Whether diners have turned a label into "reported by diners" (`R-4`):
 * enough confirmations and no dispute at all. Halal and kosher get there only
 * where the restaurant declares them too.
 */
export const isReportedByDiners = (
  label: DietaryLabel,
  tally: DietaryLabelTally | undefined,
  restaurantDeclares: boolean,
): boolean =>
  !!tally &&
  tally.confirm >= DIETARY_DINER_REPORT_THRESHOLD &&
  tally.dispute === 0 &&
  (restaurantDeclares ||
    !DIETARY_LABELS_REPORTED_ONLY_WITH_RESTAURANT.includes(label));

/**
 * A creator's labels split by who claims them now: those diners have
 * reported, and those that are still only the creator's claim.
 */
export const creatorLabelsBySource = (
  labels: unknown,
  tallies: DietaryLabelTallies,
  restaurantLabels: readonly DietaryLabel[],
): { reported: DietaryLabel[]; creator: DietaryLabel[] } => {
  const known = dietaryLabelsOf(labels);
  const reported = known.filter((label) =>
    isReportedByDiners(label, tallies[label], restaurantLabels.includes(label)),
  );

  return {
    reported,
    creator: known.filter((label) => !reported.includes(label)),
  };
};
