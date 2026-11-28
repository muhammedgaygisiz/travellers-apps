import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { clearedImageCheck } from '../shared/moderation/checked-image-subjects';
import { logOperatorAction } from '../shared/operator-log';
import {
  parseRequiredString,
  requireRestaurantAuthority,
  RESTAURANT_COLLECTION,
} from '../restaurants/restaurant-authority';
import { DietaryLabel, isDietaryLabel } from './dietary-votes';
import {
  DIETARY_LABEL_REMOVALS_COLLECTION,
  dietaryLabelRemovalId,
  MAX_DIETARY_RESTORATION_EXPLANATION_LENGTH,
  removalRecordOf,
} from './dietary-restoration';
import {
  compactMap,
  menuDietaryMapOf,
  menuIdOf,
  menuRowsOf,
  MENUS_COLLECTION,
} from './menu-dietary';

export interface RequestDietaryLabelRestorationRequest {
  restaurantId?: unknown;
  menuItemId?: unknown;
  label?: unknown;
  explanation?: unknown;
  withPhoto?: unknown;
}

export type RequestDietaryLabelRestorationResponse =
  { status: 'requested'; removalId: string } | { status: 'not-removed' };

const parseLabel = (value: unknown): DietaryLabel => {
  if (!isDietaryLabel(value)) {
    throw new HttpsError('invalid-argument', 'label is not a dietary label.');
  }

  return value;
};

const parseExplanation = (value: unknown): string => {
  const explanation = typeof value === 'string' ? value.trim() : '';

  if (!explanation) {
    throw new HttpsError('invalid-argument', 'explanation is required.');
  }

  if (explanation.length > MAX_DIETARY_RESTORATION_EXPLANATION_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `explanation must be at most ${MAX_DIETARY_RESTORATION_EXPLANATION_LENGTH} characters.`,
    );
  }

  return explanation;
};

/**
 * A restaurant asks for a label diners' disputes removed back (GitHub issue
 * #2199), with an explanation and, when `withPhoto`, a photo of the
 * ingredients, recipe or supplier change that follows.
 *
 * The request reopens the removal's queue item for an operator and marks the
 * dish's removal as requested, which the business editor shows. With a photo,
 * the item is marked `pending` first; the app then uploads into
 * `images/dietaryLabelRemovals/{removalId}/`, and only the image check
 * publishes it (`setDietaryEvidenceImagePathOnUpload`). A second request
 * replaces the first, photo included.
 *
 * The explanation is read by operators only, so it is not content-checked;
 * the photo is, because it is an upload like any other. Only an account
 * holding the restaurant, or an operator, asks; only an operator decides.
 */
export const requestDietaryLabelRestorationHandler = async (
  request: CallableRequest<RequestDietaryLabelRestorationRequest>,
  now: Date = new Date(),
): Promise<RequestDietaryLabelRestorationResponse> => {
  const data = request.data ?? {};
  const restaurantId = parseRequiredString(data.restaurantId, 'restaurantId');
  const menuItemId = parseRequiredString(data.menuItemId, 'menuItemId');
  const label = parseLabel(data.label);
  const explanation = parseExplanation(data.explanation);
  const withPhoto = data.withPhoto === true;

  const actingUid = await requireRestaurantAuthority(request, restaurantId);
  const db = getFirestore();
  const removalId = dietaryLabelRemovalId(restaurantId, menuItemId, label);
  const removalRef = db
    .collection(DIETARY_LABEL_REMOVALS_COLLECTION)
    .doc(removalId);
  const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc(restaurantId);

  const status = await db.runTransaction(async (transaction) => {
    const restaurant = (await transaction.get(restaurantRef)).data();
    const menuId = menuIdOf(restaurant);
    const menuRef = menuId
      ? db.collection(MENUS_COLLECTION).doc(menuId)
      : undefined;
    const menu = menuRef ? (await transaction.get(menuRef)).data() : undefined;
    const removalSnapshot = await transaction.get(removalRef);
    const { dietary } = menuDietaryMapOf(menu);
    const entry = dietary[menuItemId];
    const removal = entry?.removed?.[label];

    if (!menuRef || !entry || !removal) {
      return 'not-removed' as const;
    }

    const requestedAt = now.toISOString();
    const row = menuRowsOf(menu).find(
      (candidate) => candidate.id === menuItemId,
    );

    dietary[menuItemId] = {
      ...entry,
      removed: {
        ...entry.removed,
        [label]: { ...removal, restorationRequestedAt: requestedAt },
      },
    };
    transaction.update(menuRef, { dietary: compactMap(dietary) });

    // A removal from before #2199 has no queue item yet; the request makes it.
    const base = removalSnapshot.exists
      ? {}
      : removalRecordOf({
          restaurantId,
          restaurant,
          menuItemId,
          dishName: row?.name ?? '',
          label,
          removal,
        });

    transaction.set(
      removalRef,
      {
        ...base,
        status: 'open',
        explanation,
        requestedAt,
        requesterUid: actingUid,
        imagePath: FieldValue.delete(),
        imageRefusalCategory: FieldValue.delete(),
        imageStatus: withPhoto ? 'pending' : FieldValue.delete(),
        ...clearedImageCheck(),
      },
      { merge: true },
    );

    return 'requested' as const;
  });

  if (status === 'not-removed') {
    return { status };
  }

  logOperatorAction(request, {
    action: 'requestDietaryLabelRestoration',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    details: { menuItemId, label, withPhoto },
  });

  return { status, removalId };
};

export const requestDietaryLabelRestoration = onAppCheck<
  RequestDietaryLabelRestorationRequest,
  Promise<RequestDietaryLabelRestorationResponse>
>({ timeoutSeconds: 30 }, (request) =>
  requestDietaryLabelRestorationHandler(request),
);
