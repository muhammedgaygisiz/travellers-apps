import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  parseRequiredString,
  RESTAURANT_COLLECTION,
} from '../restaurants/restaurant-authority';
import { DIETARY_LABELS, DietaryLabel, isDietaryLabel } from './dietary-votes';
import {
  compactMap,
  DIETARY_LABEL_APPROVALS_COLLECTION,
  DietaryLabelKind,
  labelsOf,
  menuDietaryMapOf,
  menuIdOf,
  MENUS_COLLECTION,
} from './menu-dietary';

export interface AnswerDietaryLabelApprovalRequest {
  restaurantId?: unknown;
  menuItemId?: unknown;
  label?: unknown;
  kind?: unknown;
  approve?: unknown;
}

export interface AnswerDietaryLabelApprovalResponse {
  status: 'approved' | 'refused' | 'gone';
}

const parseKind = (value: unknown): DietaryLabelKind => {
  if (value !== 'label' && value !== 'option') {
    throw new HttpsError('invalid-argument', 'kind is label or option.');
  }

  return value;
};

const parseLabel = (value: unknown): DietaryLabel => {
  if (!isDietaryLabel(value)) {
    throw new HttpsError('invalid-argument', 'label is not a dietary label.');
  }

  return value;
};

const without = (list: unknown, label: DietaryLabel): DietaryLabel[] =>
  labelsOf(list).filter((kept) => kept !== label);

/**
 * An operator approves or refuses one label a restaurant at the strike limit
 * asked to publish (GitHub issue #2198, `R-8`).
 *
 * Approved, the label is published on the dish as if the owner had saved it.
 * Refused, it is dropped. Either way it leaves the queue. `gone` is a label no
 * longer waiting - the owner saved again, or another operator answered - and a
 * label diners removed meanwhile is never approved, because only restoring it
 * (#2199) lifts the lock.
 */
export const answerDietaryLabelApprovalHandler = async (
  request: CallableRequest<AnswerDietaryLabelApprovalRequest>,
  now: Date = new Date(),
): Promise<AnswerDietaryLabelApprovalResponse> => {
  requireAdmin(request);

  const data = request.data ?? {};
  const restaurantId = parseRequiredString(data.restaurantId, 'restaurantId');
  const menuItemId = parseRequiredString(data.menuItemId, 'menuItemId');
  const label = parseLabel(data.label);
  const kind = parseKind(data.kind);

  if (typeof data.approve !== 'boolean') {
    throw new HttpsError('invalid-argument', 'approve must be true or false.');
  }

  const approve = data.approve;
  const db = getFirestore();
  const approvalRef = db
    .collection(DIETARY_LABEL_APPROVALS_COLLECTION)
    .doc(restaurantId);
  const field = kind === 'label' ? 'labels' : 'options';

  const status = await db.runTransaction(async (transaction) => {
    const approval = (await transaction.get(approvalRef)).data();
    const items = {
      ...((approval?.['items'] ?? {}) as Record<
        string,
        Record<string, unknown>
      >),
    };
    const item = items[menuItemId];

    if (!item || !labelsOf(item[field]).includes(label)) {
      return 'gone' as const;
    }

    let outcome: AnswerDietaryLabelApprovalResponse['status'] = 'refused';

    if (approve) {
      const restaurantRef = db
        .collection(RESTAURANT_COLLECTION)
        .doc(restaurantId);
      const menuId = menuIdOf((await transaction.get(restaurantRef)).data());
      const menuRef = menuId
        ? db.collection(MENUS_COLLECTION).doc(menuId)
        : undefined;
      const menu = menuRef
        ? (await transaction.get(menuRef)).data()
        : undefined;

      if (!menuRef || !menu) {
        throw new HttpsError(
          'failed-precondition',
          'The restaurant has no menu.',
        );
      }

      const { dietary } = menuDietaryMapOf(menu);
      const entry = dietary[menuItemId] ?? {};

      if (entry.removed?.[label]) {
        outcome = 'gone';
      } else {
        const listed = new Set([...(entry[field] ?? []), label]);

        dietary[menuItemId] = {
          ...entry,
          [field]: DIETARY_LABELS.filter((known) => listed.has(known)),
        };
        transaction.update(menuRef, {
          dietary: compactMap(dietary),
          updatedAt: now.toISOString(),
          updatedAtTimestamp: now.getTime(),
        });
        outcome = 'approved';
      }
    }

    const rest = without(item[field], label);
    const nextItem = { ...item, [field]: rest };

    if (!rest.length) {
      delete nextItem[field];
    }

    if (
      labelsOf(nextItem['labels']).length ||
      labelsOf(nextItem['options']).length
    ) {
      items[menuItemId] = nextItem;
    } else {
      delete items[menuItemId];
    }

    if (Object.keys(items).length) {
      transaction.update(approvalRef, { items });
    } else {
      transaction.delete(approvalRef);
    }

    return outcome;
  });

  logOperatorAction(request, {
    action: 'answerDietaryLabelApproval',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    details: { menuItemId, label, kind, approve, status },
  });

  return { status };
};

export const answerDietaryLabelApproval = onAppCheck<
  AnswerDietaryLabelApprovalRequest,
  Promise<AnswerDietaryLabelApprovalResponse>
>({ timeoutSeconds: 30 }, (request) =>
  answerDietaryLabelApprovalHandler(request),
);
