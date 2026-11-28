import type { DocumentData } from 'firebase-admin/firestore';
import type { DietaryLabel } from './dietary-votes';
import type { DietaryLabelRemoval } from './menu-dietary';

/**
 * A removed dietary label's queue item and the owner's request for it back
 * (GitHub issue #2199), as the backend keeps them.
 *
 * ```text
 * /dietaryLabelRemovals/{restaurantId}__{menuItemId}__{label}
 * /images/dietaryLabelRemovals/{removalId}/{file}   the evidence photo
 * ```
 *
 * Copies of `libs/bite-tribe-common/model/src/lib/dietary-restoration.ts`;
 * `menu-dietary-parity.spec.ts` keeps them equal.
 */

export const DIETARY_LABEL_REMOVALS_COLLECTION = 'dietaryLabelRemovals';
export const MAX_DIETARY_RESTORATION_EXPLANATION_LENGTH = 1000;
export const MIN_DIETARY_REMOVAL_DECISION_REASON_LENGTH = 3;

export const dietaryLabelRemovalId = (
  restaurantId: string,
  menuItemId: string,
  label: DietaryLabel,
): string => `${restaurantId}__${menuItemId}__${label}`;

/** What the removal trigger writes for one removed label. */
export const removalRecordOf = ({
  restaurantId,
  restaurant,
  menuItemId,
  dishName,
  label,
  removal,
}: {
  restaurantId: string;
  restaurant: DocumentData | undefined;
  menuItemId: string;
  dishName: string;
  label: DietaryLabel;
  removal: DietaryLabelRemoval;
}): Record<string, unknown> => ({
  restaurantId,
  restaurantName:
    typeof restaurant?.['name'] === 'string' ? restaurant['name'] : '',
  menuItemId,
  dishName,
  label,
  ...removal,
  status: 'open',
});
