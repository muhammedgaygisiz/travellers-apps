import {
  DocumentData,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import {
  ownerUserIdsOf,
  RESTAURANT_COLLECTION,
} from '../restaurants/restaurant-authority';
import {
  DIETARY_LABEL_REMOVALS_COLLECTION,
  dietaryLabelRemovalId,
  removalRecordOf,
} from './dietary-restoration';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import {
  DIETARY_LABEL_TALLIES_COLLECTION,
  DIETARY_LABEL_VOTES_COLLECTION,
  DietaryDisputeReason,
  DietaryLabel,
  DietaryLabelTally,
  isDietaryDisputeReason,
  isDietaryLabel,
  scopeItemsOf,
  StoredDietaryVote,
  tallyOf,
} from './dietary-votes';
import {
  compactMap,
  DAY_MS,
  DIETARY_REMOVAL_GOT_SICK_THRESHOLD,
  DIETARY_REMOVAL_WINDOW_DAYS,
  DietaryLabelRemoval,
  DietaryStrike,
  dietaryRemovalThreshold,
  isHighRiskDietaryLabel,
  menuDietaryMapOf,
  menuIdOf,
  menuRowsOf,
  MENUS_COLLECTION,
  publishedLabelsOf,
} from './menu-dietary';

const MENU_SCOPE_PREFIX = 'menu__';

/** One label of one dish whose disputes went up in this write. */
export interface DisputedLabel {
  menuItemId: string;
  label: DietaryLabel;
  before: DietaryLabelTally;
  after: DietaryLabelTally;
}

/** What the votes say about one disputed label, inside the window. */
export interface DisputeEvidence {
  disputes: number;
  gotSick: number;
  reasons: Partial<Record<DietaryDisputeReason, number>>;
}

/** The labels whose dispute count rose between two tally documents. */
export const disputedLabelsOf = (
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): DisputedLabel[] => {
  const beforeItems = scopeItemsOf<unknown>(before);
  const disputed: DisputedLabel[] = [];

  Object.entries(scopeItemsOf<unknown>(after)).forEach(([menuItemId, labels]) =>
    Object.entries(labels).forEach(([label, raw]) => {
      if (!isDietaryLabel(label)) {
        return;
      }

      const next = tallyOf(raw);
      const previous = tallyOf(beforeItems[menuItemId]?.[label]);

      if (next.dispute > previous.dispute) {
        disputed.push({ menuItemId, label, before: previous, after: next });
      }
    }),
  );

  return disputed;
};

/**
 * Counts one label's disputes inside the window from the votes themselves,
 * one per account: a vote document is one account's, and its second vote
 * replaced its first, so an account is never counted twice. Eligibility was
 * checked when each vote was cast (`RD-DC-6`), which is the abuse check
 * `RD-DC-7` relies on.
 */
export const disputeEvidenceOf = (
  votes: DocumentData[],
  menuItemId: string,
  label: DietaryLabel,
  now: Date,
): DisputeEvidence => {
  const since = now.getTime() - DIETARY_REMOVAL_WINDOW_DAYS * DAY_MS;
  const evidence: DisputeEvidence = { disputes: 0, gotSick: 0, reasons: {} };

  votes.forEach((data) => {
    const vote = scopeItemsOf<StoredDietaryVote>(data)[menuItemId]?.[label];

    if (vote?.vote !== 'dispute' || !(Date.parse(vote.votedAt) >= since)) {
      return;
    }

    evidence.disputes += 1;

    if (isDietaryDisputeReason(vote.reason)) {
      evidence.reasons[vote.reason] = (evidence.reasons[vote.reason] ?? 0) + 1;
    }

    if (vote.reason === 'got-sick') {
      evidence.gotSick += 1;
    }
  });

  return evidence;
};

/**
 * Whether diners' disputes remove a restaurant's label (`R-6`, `RD-DC-7`):
 * enough eligible disputes within the window - fewer for a high-risk label,
 * and a single "I got sick" for one - and, either way, more disputes than
 * confirmations.
 */
export const reachesRemoval = (
  label: DietaryLabel,
  tally: DietaryLabelTally,
  evidence: DisputeEvidence,
): boolean => {
  const enough =
    evidence.disputes >= dietaryRemovalThreshold(label) ||
    (isHighRiskDietaryLabel(label) &&
      evidence.gotSick >= DIETARY_REMOVAL_GOT_SICK_THRESHOLD);

  return enough && tally.dispute > tally.confirm;
};

interface AppliedRemoval {
  menuItemId: string;
  label: DietaryLabel;
}

/**
 * Removes the labels in one transaction on the menu and the restaurant: the
 * label leaves the dish's labels, is kept under `removed` with its disputes,
 * and counts as a strike. A label the dish no longer publishes - taken off by
 * the owner, or removed already - is left alone, so a retried event removes
 * nothing twice.
 */
const applyRemovals = async (
  db: Firestore,
  restaurantId: string,
  removals: (DisputedLabel & { evidence: DisputeEvidence })[],
  now: Date,
): Promise<{ applied: AppliedRemoval[]; menu?: DocumentData }> =>
  db.runTransaction(async (transaction) => {
    const restaurantRef = db
      .collection(RESTAURANT_COLLECTION)
      .doc(restaurantId);
    const restaurant = (await transaction.get(restaurantRef)).data();
    const menuId = menuIdOf(restaurant);

    if (!restaurant || !menuId) {
      return { applied: [] };
    }

    const menuRef = db.collection(MENUS_COLLECTION).doc(menuId);
    const menu = (await transaction.get(menuRef)).data();

    if (!menu) {
      return { applied: [] };
    }

    const { dietary } = menuDietaryMapOf(menu);
    const applied: AppliedRemoval[] = [];
    const strikes: DietaryStrike[] = [];
    const removedAt = now.toISOString();

    removals.forEach(({ menuItemId, label, after, evidence }) => {
      const entry = dietary[menuItemId];

      if (!entry || !publishedLabelsOf(entry).includes(label)) {
        return;
      }

      const removal: DietaryLabelRemoval = {
        removedAt,
        disputes: evidence.disputes,
        confirmations: after.confirm,
        reasons: evidence.reasons,
      };

      dietary[menuItemId] = {
        ...entry,
        labels: (entry.labels ?? []).filter((kept) => kept !== label),
        removed: { ...(entry.removed ?? {}), [label]: removal },
      };
      applied.push({ menuItemId, label });
      strikes.push({ menuItemId, label, removedAt });
      // The operator's queue item, where the owner's request lands (#2199).
      transaction.set(
        db
          .collection(DIETARY_LABEL_REMOVALS_COLLECTION)
          .doc(dietaryLabelRemovalId(restaurantId, menuItemId, label)),
        removalRecordOf({
          restaurantId,
          restaurant,
          menuItemId,
          dishName: dishNameOf(menu, menuItemId),
          label,
          removal,
        }),
      );
    });

    if (applied.length) {
      transaction.update(menuRef, {
        dietary: compactMap(dietary),
        updatedAt: removedAt,
        updatedAtTimestamp: now.getTime(),
      });
      transaction.update(restaurantRef, {
        dietaryStrikes: [
          ...(Array.isArray(restaurant['dietaryStrikes'])
            ? restaurant['dietaryStrikes']
            : []),
          ...strikes,
        ],
      });
    }

    return { applied, menu };
  });

const dishNameOf = (
  menu: DocumentData | undefined,
  menuItemId: string,
): string => {
  const row = menuRowsOf(menu).find((candidate) => candidate.id === menuItemId);

  if (!row) {
    return '';
  }

  return row.dishName && row.dishName !== row.name
    ? `${row.dishName} - ${row.name}`
    : row.name;
};

/**
 * What one write of a menu's counts does (GitHub issue #2198): removes every
 * label it pushed over the threshold, and tells the restaurant's owners about
 * a label's first dispute and about each removal. A label removed by the same
 * write that disputed it first is announced once, as removed.
 */
export const handleDietaryTallyWrite = async (
  scopeKey: string,
  before: DocumentData | undefined,
  after: DocumentData | undefined,
  now: Date = new Date(),
): Promise<{ removed: AppliedRemoval[]; firstDisputes: AppliedRemoval[] }> => {
  const none = { removed: [], firstDisputes: [] };

  if (!scopeKey.startsWith(MENU_SCOPE_PREFIX)) {
    return none;
  }

  const disputed = disputedLabelsOf(before, after);

  if (!disputed.length) {
    return none;
  }

  const restaurantId = scopeKey.slice(MENU_SCOPE_PREFIX.length);
  const db = getFirestore();

  // The votes are read only when a label could be removed at all: disputes
  // must outnumber confirmations whatever the window says.
  const candidates = disputed.filter(
    ({ after: tally }) => tally.dispute > tally.confirm,
  );
  const votes = candidates.length
    ? (
        await db
          .collection(DIETARY_LABEL_VOTES_COLLECTION)
          .where('scopeKey', '==', scopeKey)
          .get()
      ).docs.map((doc) => doc.data())
    : [];
  const removals = candidates
    .map((candidate) => ({
      ...candidate,
      evidence: disputeEvidenceOf(
        votes,
        candidate.menuItemId,
        candidate.label,
        now,
      ),
    }))
    .filter(({ label, after: tally, evidence }) =>
      reachesRemoval(label, tally, evidence),
    );

  const { applied, menu: menuAfterRemoval } = removals.length
    ? await applyRemovals(db, restaurantId, removals, now)
    : { applied: [] as AppliedRemoval[], menu: undefined };
  const isApplied = (item: AppliedRemoval): boolean =>
    applied.some(
      (removal) =>
        removal.menuItemId === item.menuItemId && removal.label === item.label,
    );
  const firstDisputes = disputed
    .filter(({ before: tally }) => tally.dispute === 0)
    .filter((item) => !isApplied(item))
    .map(({ menuItemId, label }) => ({ menuItemId, label }));

  if (!applied.length && !firstDisputes.length) {
    return none;
  }

  const restaurant = (
    await db.collection(RESTAURANT_COLLECTION).doc(restaurantId).get()
  ).data();
  const owners = ownerUserIdsOf(restaurant);
  const menuId = menuIdOf(restaurant);
  const menu =
    menuAfterRemoval ??
    (menuId
      ? (await db.collection(MENUS_COLLECTION).doc(menuId).get()).data()
      : undefined);
  const restaurantName =
    typeof restaurant?.['name'] === 'string' ? restaurant['name'] : '';

  logger.info('removeDisputedDietaryLabels: evaluated', {
    scopeKey,
    removed: applied,
    firstDisputes,
  });

  if (owners.length) {
    for (const { menuItemId, label } of firstDisputes) {
      await sendLocalizedNotification({
        uids: owners,
        data: {
          type: 'DIETARY_LABEL_DISPUTED',
          restaurantId,
          menuItemId,
          label,
        },
        buildMessage: (translate) => ({
          title: translate('dietaryLabelDisputed.title'),
          body: translate('dietaryLabelDisputed.body', {
            dish: dishNameOf(menu, menuItemId),
            restaurant: restaurantName,
          }),
        }),
      });
    }

    for (const { menuItemId, label } of applied) {
      await sendLocalizedNotification({
        uids: owners,
        data: {
          type: 'DIETARY_LABEL_REMOVED',
          restaurantId,
          menuItemId,
          label,
        },
        buildMessage: (translate) => ({
          title: translate('dietaryLabelRemoved.title'),
          body: translate('dietaryLabelRemoved.body', {
            dish: dishNameOf(menu, menuItemId),
            restaurant: restaurantName,
          }),
        }),
      });
    }
  }

  return { removed: applied, firstDisputes };
};

/**
 * Removes and locks a restaurant's label that diners dispute (GitHub issue
 * #2198, `RD-DC-4`), on every write of a menu's dietary counts. Nobody acts:
 * the vote that crosses the threshold removes the label.
 */
export const removeDisputedDietaryLabels = onDocumentWritten(
  `${DIETARY_LABEL_TALLIES_COLLECTION}/{scopeKey}`,
  async (event) => {
    await handleDietaryTallyWrite(
      event.params.scopeKey,
      event.data?.before.data(),
      event.data?.after.data(),
    );
  },
);
