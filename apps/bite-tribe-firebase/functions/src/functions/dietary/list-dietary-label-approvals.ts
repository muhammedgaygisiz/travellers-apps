import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireAdmin } from '../shared/roles';
import { DietaryLabel } from './dietary-votes';
import { DIETARY_LABEL_APPROVALS_COLLECTION, labelsOf } from './menu-dietary';

export interface DietaryLabelApprovalItem {
  menuItemId: string;
  name: string;
  labels: DietaryLabel[];
  options: DietaryLabel[];
}

export interface DietaryLabelApprovalEntry {
  restaurantId: string;
  restaurantName: string;
  requestedAt: string;
  items: DietaryLabelApprovalItem[];
}

export interface ListDietaryLabelApprovalsResponse {
  approvals: DietaryLabelApprovalEntry[];
}

/** At most this many restaurants a call; the queue is short by design. */
const MAX_APPROVALS = 200;

/**
 * The labels waiting for an operator, oldest request first (GitHub issue
 * #2198, `R-8`). The rules refuse `dietaryLabelApprovals` to every client, so
 * the admin app reads the queue here, like the report queues.
 */
export const listDietaryLabelApprovalsHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListDietaryLabelApprovalsResponse> => {
  requireAdmin(request);

  const snapshot = await getFirestore()
    .collection(DIETARY_LABEL_APPROVALS_COLLECTION)
    .limit(MAX_APPROVALS)
    .get();

  const approvals = snapshot.docs
    .map((doc): DietaryLabelApprovalEntry => {
      const data = doc.data();
      const items = (data['items'] ?? {}) as Record<
        string,
        Record<string, unknown>
      >;

      return {
        restaurantId: doc.id,
        restaurantName:
          typeof data['restaurantName'] === 'string'
            ? data['restaurantName']
            : '',
        requestedAt:
          typeof data['requestedAt'] === 'string' ? data['requestedAt'] : '',
        items: Object.entries(items)
          .map(([menuItemId, item]) => ({
            menuItemId,
            name: typeof item?.['name'] === 'string' ? item['name'] : '',
            labels: labelsOf(item?.['labels']),
            options: labelsOf(item?.['options']),
          }))
          .filter((item) => item.labels.length || item.options.length),
      };
    })
    .filter((approval) => approval.items.length)
    .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));

  return { approvals };
};

export const listDietaryLabelApprovals = onAppCheck<
  unknown,
  Promise<ListDietaryLabelApprovalsResponse>
>({ timeoutSeconds: 30 }, listDietaryLabelApprovalsHandler);
