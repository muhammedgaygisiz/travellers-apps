import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  DIETARY_EVIDENCE_PHOTO,
  imageFolderOf,
} from '../shared/moderation/checked-image-subjects';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  parseRequiredString,
  RESTAURANT_COLLECTION,
} from '../restaurants/restaurant-authority';
import {
  DIETARY_LABEL_TALLIES_COLLECTION,
  DIETARY_LABEL_VOTES_COLLECTION,
  DIETARY_LABELS,
  DietaryLabel,
  isDietaryLabel,
  menuScopeKey,
  scopeItemsOf,
  StoredDietaryVote,
  tallyOf,
} from './dietary-votes';
import {
  DIETARY_LABEL_REMOVALS_COLLECTION,
  MIN_DIETARY_REMOVAL_DECISION_REASON_LENGTH,
} from './dietary-restoration';
import {
  compactMap,
  menuDietaryMapOf,
  menuIdOf,
  MENUS_COLLECTION,
} from './menu-dietary';

export interface AnswerDietaryLabelRemovalRequest {
  removalId?: unknown;
  decision?: unknown;
  reason?: unknown;
}

export interface AnswerDietaryLabelRemovalResponse {
  status: 'restored' | 'confirmed' | 'gone';
}

type Decision = 'restore' | 'confirm';

const parseDecision = (value: unknown): Decision => {
  if (value !== 'restore' && value !== 'confirm') {
    throw new HttpsError('invalid-argument', 'decision is restore or confirm.');
  }

  return value;
};

const parseReason = (value: unknown): string => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (reason.length < MIN_DIETARY_REMOVAL_DECISION_REASON_LENGTH) {
    throw new HttpsError('invalid-argument', 'A reason is required.');
  }

  return reason;
};

/** A scope's votes without one label's disputes on one dish. */
const withoutDisputes = (
  items: Record<string, Record<string, StoredDietaryVote>>,
  menuItemId: string,
  label: DietaryLabel,
): {
  items: Record<string, Record<string, StoredDietaryVote>>;
  changed: boolean;
} => {
  if (items[menuItemId]?.[label]?.vote !== 'dispute') {
    return { items, changed: false };
  }

  const dish = { ...items[menuItemId] };
  delete dish[label];

  const next = { ...items };

  if (Object.keys(dish).length) {
    next[menuItemId] = dish;
  } else {
    delete next[menuItemId];
  }

  return { items: next, changed: true };
};

/**
 * An operator restores a removed dietary label or confirms its removal, with
 * a reason the operator log keeps (GitHub issue #2199, `R-7`, `RD-DC-8`).
 *
 * **Restore** puts the label back on the dish, so it shows again and matches
 * filters. It discards the disputes that removed it - their votes are deleted
 * and the label's dispute count starts from zero, while its confirmations stay
 * - and takes back the strike the removal cost (`RD-DC-8`). The queue item and
 * its evidence photo go. An operator restores with or without a request, for
 * example after brigading.
 *
 * **Confirm** keeps the label removed and its strike counted, closes the queue
 * item and clears the owner's request, so the owner may ask again only with
 * new evidence.
 *
 * `gone` is a removal no longer there: restored or answered meanwhile.
 */
export const answerDietaryLabelRemovalHandler = async (
  request: CallableRequest<AnswerDietaryLabelRemovalRequest>,
  now: Date = new Date(),
): Promise<AnswerDietaryLabelRemovalResponse> => {
  requireAdmin(request);

  const data = request.data ?? {};
  const removalId = parseRequiredString(data.removalId, 'removalId');
  const decision = parseDecision(data.decision);
  const reason = parseReason(data.reason);
  const db = getFirestore();
  const removalRef = db
    .collection(DIETARY_LABEL_REMOVALS_COLLECTION)
    .doc(removalId);

  const outcome = await db.runTransaction(async (transaction) => {
    const record = (await transaction.get(removalRef)).data();
    const restaurantId = record?.['restaurantId'];
    const menuItemId = record?.['menuItemId'];
    const label = record?.['label'];

    if (
      typeof restaurantId !== 'string' ||
      typeof menuItemId !== 'string' ||
      !isDietaryLabel(label)
    ) {
      return undefined;
    }

    const restaurantRef = db
      .collection(RESTAURANT_COLLECTION)
      .doc(restaurantId);
    const restaurant = (await transaction.get(restaurantRef)).data();
    const menuId = menuIdOf(restaurant);
    const menuRef = menuId
      ? db.collection(MENUS_COLLECTION).doc(menuId)
      : undefined;
    const menu = menuRef ? (await transaction.get(menuRef)).data() : undefined;
    const { dietary } = menuDietaryMapOf(menu);
    const entry = dietary[menuItemId];
    const removal = entry?.removed?.[label];

    if (!menuRef || !entry || !removal) {
      return undefined;
    }

    const scopeKey = menuScopeKey(restaurantId);
    const tallyRef = db
      .collection(DIETARY_LABEL_TALLIES_COLLECTION)
      .doc(scopeKey);
    const [tallySnapshot, votesSnapshot] = [
      await transaction.get(tallyRef),
      await transaction.get(
        db
          .collection(DIETARY_LABEL_VOTES_COLLECTION)
          .where('scopeKey', '==', scopeKey),
      ),
    ];
    const removed = { ...entry.removed };

    if (decision === 'confirm') {
      removed[label] = { ...removal };
      delete removed[label]?.restorationRequestedAt;
      dietary[menuItemId] = { ...entry, removed };
      transaction.update(menuRef, { dietary: compactMap(dietary) });
      transaction.update(removalRef, {
        status: 'confirmed',
        confirmedAt: now.toISOString(),
        decisionReason: reason,
      });

      return { restaurantId, menuItemId, label, status: 'confirmed' as const };
    }

    // Restore: the label is back, and nothing that removed it counts.
    delete removed[label];
    const listed = new Set([...(entry.labels ?? []), label]);
    dietary[menuItemId] = {
      ...entry,
      labels: DIETARY_LABELS.filter((known) => listed.has(known)),
      removed,
    };
    transaction.update(menuRef, {
      dietary: compactMap(dietary),
      updatedAt: now.toISOString(),
      updatedAtTimestamp: now.getTime(),
    });

    const strikes = restaurant?.['dietaryStrikes'];
    transaction.update(restaurantRef, {
      dietaryStrikes: (Array.isArray(strikes) ? strikes : []).filter(
        (strike) =>
          !(
            strike?.menuItemId === menuItemId &&
            strike?.label === label &&
            strike?.removedAt === removal.removedAt
          ),
      ),
    });

    votesSnapshot.docs.forEach((voteDoc) => {
      const { items, changed } = withoutDisputes(
        scopeItemsOf<StoredDietaryVote>(voteDoc.data()),
        menuItemId,
        label,
      );

      if (!changed) {
        return;
      }

      if (Object.keys(items).length) {
        transaction.update(voteDoc.ref, { items });
      } else {
        transaction.delete(voteDoc.ref);
      }
    });

    if (tallySnapshot.exists) {
      const tallies = scopeItemsOf<unknown>(tallySnapshot.data());
      const { confirm } = tallyOf(tallies[menuItemId]?.[label]);
      const dish = { ...(tallies[menuItemId] ?? {}) };

      if (confirm) {
        dish[label] = { confirm, dispute: 0 };
      } else {
        delete dish[label];
      }

      const next = { ...tallies, [menuItemId]: dish };

      if (!Object.keys(dish).length) {
        delete next[menuItemId];
      }

      transaction.update(tallyRef, {
        items: next,
        updatedAt: now.toISOString(),
      });
    }

    transaction.delete(removalRef);

    return { restaurantId, menuItemId, label, status: 'restored' as const };
  });

  if (!outcome) {
    return { status: 'gone' };
  }

  if (outcome.status === 'restored') {
    // The evidence photo has no purpose once the label is back.
    await getStorage()
      .bucket()
      .deleteFiles({ prefix: imageFolderOf(DIETARY_EVIDENCE_PHOTO, removalId) })
      .catch((error: unknown) =>
        logger.warn('answerDietaryLabelRemoval: evidence not deleted', {
          removalId,
          error: String(error),
        }),
      );
  }

  logOperatorAction(request, {
    action: 'answerDietaryLabelRemoval',
    targetType: 'restaurant',
    targetId: outcome.restaurantId,
    outcome: 'succeeded',
    reason,
    details: {
      decision,
      menuItemId: outcome.menuItemId,
      label: outcome.label,
    },
  });

  return { status: outcome.status };
};

export const answerDietaryLabelRemoval = onAppCheck<
  AnswerDietaryLabelRemovalRequest,
  Promise<AnswerDietaryLabelRemovalResponse>
>({ timeoutSeconds: 60 }, (request) =>
  answerDietaryLabelRemovalHandler(request),
);
