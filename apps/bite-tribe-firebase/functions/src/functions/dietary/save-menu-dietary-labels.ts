import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { hasRole } from '../shared/roles';
import {
  parseRequiredString,
  requireRestaurantAuthority,
  RESTAURANT_COLLECTION,
} from '../restaurants/restaurant-authority';
import { DietaryLabel, isDietaryLabel } from './dietary-votes';
import {
  compactEntry,
  compactMap,
  DIETARY_LABEL_APPROVALS_COLLECTION,
  labelsOf,
  MenuDietary,
  MenuDietaryLabelRef,
  menuDietaryMapOf,
  menuIdOf,
  menuRowsOf,
  MENUS_COLLECTION,
  needsApproval,
  publishedLabelsOf,
} from './menu-dietary';

export interface SaveMenuDietaryLabelsRequest {
  restaurantId?: unknown;
  items?: unknown;
}

export interface SaveMenuDietaryLabelsResponse {
  status: 'saved';
  locked: MenuDietaryLabelRef[];
  pending: MenuDietaryLabelRef[];
}

type RequestedItems = Record<
  string,
  { labels: DietaryLabel[]; options: DietaryLabel[] }
>;

const parseLabels = (value: unknown, field: string): DietaryLabel[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((entry) => !isDietaryLabel(entry))) {
    throw new HttpsError(
      'invalid-argument',
      `${field} must be a list of dietary labels.`,
    );
  }

  return labelsOf(value);
};

const parseItems = (value: unknown): RequestedItems => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'items must be a map of dishes.');
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([id, raw]) => {
      if (!id || id.includes('/')) {
        throw new HttpsError('invalid-argument', 'A dish id is not valid.');
      }

      const item = (raw ?? {}) as Record<string, unknown>;
      const labels = parseLabels(item['labels'], 'labels');
      const options = parseLabels(item['options'], 'options').filter(
        (option) => !labels.includes(option),
      );

      return [id, { labels, options }];
    }),
  );
};

/**
 * Publishes a menu's dietary labels (GitHub issue #2198), the only way a
 * client changes them: the rules refuse `menus/{id}.dietary` to every client,
 * so the business editor saves the menu without its labels and sends them
 * here.
 *
 * Two kinds of label are not published, and the answer names each:
 *
 * - **locked** - removed after diner reports. The owner cannot set it again,
 *   as a label or as an option, and only an Operator restores it (`R-7`).
 * - **pending** - a label the dish does not publish yet, from a restaurant at
 *   the strike limit (`R-8`). It waits in `dietaryLabelApprovals` for an
 *   operator and is shown nowhere. A label already published stays published.
 *   An operator's own save is never held: the operator is the approver.
 *
 * Every dish on the stored menu is written: one the request does not name
 * keeps what it had, and a name the menu no longer has is dropped. The
 * removals stay on their dish whatever is sent.
 */
export const saveMenuDietaryLabelsHandler = async (
  request: CallableRequest<SaveMenuDietaryLabelsRequest>,
  now: Date = new Date(),
): Promise<SaveMenuDietaryLabelsResponse> => {
  const data = request.data ?? {};
  const restaurantId = parseRequiredString(data.restaurantId, 'restaurantId');
  const items = parseItems(data.items);

  await requireRestaurantAuthority(request, restaurantId);

  const isOperator = hasRole(request, 'admin');
  const db = getFirestore();
  const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc(restaurantId);
  const approvalRef = db
    .collection(DIETARY_LABEL_APPROVALS_COLLECTION)
    .doc(restaurantId);

  const result = await db.runTransaction(async (transaction) => {
    const restaurant = (await transaction.get(restaurantRef)).data();
    const menuId = menuIdOf(restaurant);

    if (!menuId) {
      throw new HttpsError(
        'failed-precondition',
        'The restaurant has no menu.',
      );
    }

    const menuRef = db.collection(MENUS_COLLECTION).doc(menuId);
    const [menuSnapshot, approvalSnapshot] = [
      await transaction.get(menuRef),
      await transaction.get(approvalRef),
    ];

    if (!menuSnapshot.exists) {
      throw new HttpsError('not-found', 'The menu was not found.');
    }

    const menu = menuSnapshot.data();
    const { dietary: current } = menuDietaryMapOf(menu);
    const gated = !isOperator && needsApproval(restaurant, now);
    const next: MenuDietary = {};
    const locked: MenuDietaryLabelRef[] = [];
    const pending: MenuDietaryLabelRef[] = [];
    const pendingItems: Record<
      string,
      { name: string; labels?: DietaryLabel[]; options?: DietaryLabel[] }
    > = {};

    menuRowsOf(menu).forEach((row) => {
      const entry = current[row.id] ?? {};
      const requested = items[row.id];

      if (!requested) {
        next[row.id] = entry;
        return;
      }

      const published = publishedLabelsOf(entry);
      const publishedOptions = entry.options ?? [];
      const labels: DietaryLabel[] = [];
      const options: DietaryLabel[] = [];
      const held: { labels: DietaryLabel[]; options: DietaryLabel[] } = {
        labels: [],
        options: [],
      };

      requested.labels.forEach((label) => {
        if (entry.removed?.[label]) {
          locked.push({ menuItemId: row.id, label, kind: 'label' });
        } else if (gated && !published.includes(label)) {
          held.labels.push(label);
          pending.push({ menuItemId: row.id, label, kind: 'label' });
        } else {
          labels.push(label);
        }
      });

      requested.options.forEach((label) => {
        if (entry.removed?.[label]) {
          locked.push({ menuItemId: row.id, label, kind: 'option' });
        } else if (gated && !publishedOptions.includes(label)) {
          held.options.push(label);
          pending.push({ menuItemId: row.id, label, kind: 'option' });
        } else {
          options.push(label);
        }
      });

      next[row.id] = compactEntry({ labels, options, removed: entry.removed });

      if (held.labels.length || held.options.length) {
        pendingItems[row.id] = {
          name:
            row.dishName && row.dishName !== row.name
              ? `${row.dishName} - ${row.name}`
              : row.name,
          ...(held.labels.length ? { labels: held.labels } : {}),
          ...(held.options.length ? { options: held.options } : {}),
        };
      }
    });

    transaction.update(menuRef, {
      dietary: compactMap(next),
      updatedAt: now.toISOString(),
      updatedAtTimestamp: now.getTime(),
    });

    // What waits is what the owner asks for now: a save replaces it, and a
    // save that publishes everything leaves nothing waiting.
    if (Object.keys(pendingItems).length) {
      transaction.set(approvalRef, {
        restaurantId,
        restaurantName:
          typeof restaurant?.['name'] === 'string' ? restaurant['name'] : '',
        items: pendingItems,
        requestedAt: now.toISOString(),
      });
    } else if (approvalSnapshot.exists) {
      transaction.delete(approvalRef);
    }

    return { menuId, locked, pending };
  });

  logOperatorAction(request, {
    action: 'saveMenuDietaryLabels',
    targetType: 'menu',
    targetId: result.menuId,
    outcome: 'succeeded',
    details: {
      restaurantId,
      locked: result.locked.length,
      pending: result.pending.length,
    },
  });

  return { status: 'saved', locked: result.locked, pending: result.pending };
};

export const saveMenuDietaryLabels = onAppCheck<
  SaveMenuDietaryLabelsRequest,
  Promise<SaveMenuDietaryLabelsResponse>
>({ timeoutSeconds: 30 }, (request) => saveMenuDietaryLabelsHandler(request));
