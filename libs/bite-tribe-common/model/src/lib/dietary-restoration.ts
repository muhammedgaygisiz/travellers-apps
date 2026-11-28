import type { DietaryLabel } from './dietary-label';
import type { DietaryLabelRemoval } from './dietary-removal';
import type { DietaryDisputeReason } from './dietary-vote';

/**
 * Asking for a removed dietary label back, and an operator's answer (GitHub
 * issue #2199, epic #2193, `RD-DC-8`).
 *
 * Every removal by `removeDisputedDietaryLabels` also writes one document in
 * {@link DIETARY_LABEL_REMOVALS_COLLECTION}: the operator's queue item, and
 * where the owner's request lands. Its evidence photo is uploaded into the
 * document's own folder, `images/dietaryLabelRemovals/{removalId}/`, and is
 * published on the document only once the image check passed it, like a
 * restaurant photo (#2141).
 *
 * The constants are repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/dietary/dietary-restoration.ts`;
 * `menu-dietary-parity.spec.ts` keeps them equal.
 */

export const DIETARY_LABEL_REMOVALS_COLLECTION = 'dietaryLabelRemovals';

/** The longest explanation an owner may send with a request. */
export const MAX_DIETARY_RESTORATION_EXPLANATION_LENGTH = 1000;

/** The shortest reason an operator gives for a decision. */
export const MIN_DIETARY_REMOVAL_DECISION_REASON_LENGTH = 3;

/** One removal's document id: the restaurant, the dish and the label. */
export const dietaryLabelRemovalId = (
  restaurantId: string,
  menuItemId: string,
  label: DietaryLabel,
): string => `${restaurantId}__${menuItemId}__${label}`;

/**
 * `open` waits for an operator: a removal nobody reviewed, or one whose owner
 * asked for it back. `confirmed` was reviewed and stays removed until the
 * owner asks again with new evidence.
 */
export type DietaryLabelRemovalStatus = 'open' | 'confirmed';

/** `dietaryLabelRemovals/{removalId}`, as the backend writes it. */
export interface DietaryLabelRemovalRecord extends DietaryLabelRemoval {
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  dishName: string;
  label: DietaryLabel;
  status: DietaryLabelRemovalStatus;
  /** The owner's request, absent until one is sent. */
  explanation?: string;
  requestedAt?: string;
  /** The evidence photo, once the image check passed it. */
  imagePath?: string;
  imageStatus?: 'pending' | 'uploaded' | 'refused' | 'failed';
  imageRefusalCategory?: string;
  confirmedAt?: string;
}

/** One dispute as the operator sees it: never who cast it. */
export interface DietaryRemovalDispute {
  reason?: DietaryDisputeReason;
  note?: string;
  votedAt: string;
}

/** One queue item, as `listDietaryLabelRemovals` returns it. */
export interface DietaryLabelRemovalEntry extends DietaryLabelRemovalRecord {
  removalId: string;
  disputesDetail: DietaryRemovalDispute[];
}

export interface ListDietaryLabelRemovalsResult {
  removals: DietaryLabelRemovalEntry[];
}

/** What the business app sends to ask for a label back. */
export interface RequestDietaryLabelRestorationRequest {
  restaurantId: string;
  menuItemId: string;
  label: DietaryLabel;
  explanation: string;
  /** True when a photo follows, so the request waits for its check. */
  withPhoto: boolean;
}

export type RequestDietaryLabelRestorationResult =
  { status: 'requested'; removalId: string } | { status: 'not-removed' };

/** What the owner writes in the business app, before it is sent. */
export interface DietaryRestorationDraft {
  menuItemId: string;
  label: DietaryLabel;
  explanation: string;
  /** The evidence photo as a data URL, when the owner chose one. */
  photo?: string;
}

/**
 * How a request ended, as the business app reports it. `photo` is the image
 * check's answer on the evidence: `checking` when it has not answered yet.
 */
export type DietaryRestorationOutcome =
  | { status: 'not-removed' }
  | { status: 'requested'; photo?: 'uploaded' | 'refused' | 'checking' };

/** An operator's decision on one removal. */
export interface AnswerDietaryLabelRemovalRequest {
  removalId: string;
  decision: 'restore' | 'confirm';
  reason: string;
}

export interface AnswerDietaryLabelRemovalResult {
  status: 'restored' | 'confirmed' | 'gone';
}
