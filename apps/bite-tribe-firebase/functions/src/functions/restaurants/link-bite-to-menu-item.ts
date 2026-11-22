import {
  DocumentData,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAnyRole } from '../shared/roles';
import {
  RESTAURANT_COLLECTION,
  holdsRestaurant,
  parseRequiredString,
} from './restaurant-authority';

const BITE_COLLECTION = 'bites';
const MENU_COLLECTION = 'menus';

/**
 * Links a guest's Bite to the dish on the restaurant's menu it is about, or
 * marks it as about nothing on the menu (GitHub issue #2216).
 *
 * Exactly one of `menuItemId` and `notOnMenu`. `variantId` only with a
 * `menuItemId` whose dish has that variant.
 */
export interface LinkBiteToMenuItemRequest {
  biteId: string;
  menuItemId?: string;
  variantId?: string;
  notOnMenu?: boolean;
}

export type LinkBiteToMenuItemResult =
  | { biteId: string; menuItemId: string; variantId?: string }
  | { biteId: string; notOnMenu: true };

/**
 * Who set a Bite's `menuItemId`. Only verification and the restaurant's
 * owner are relinked here; any other link was made by the guest, who chose the
 * dish when ordering it or when creating the Bite from the menu.
 */
const RELINKABLE_SOURCES = ['verification', 'owner'];

const isLinkedByGuest = (bite: DocumentData): boolean =>
  typeof bite['menuItemId'] === 'string' &&
  bite['menuItemId'] !== '' &&
  !RELINKABLE_SOURCES.includes(bite['menuItemLinkedBy']);

type Target =
  | { kind: 'item'; menuItemId: string; variantId?: string }
  | { kind: 'notOnMenu' };

const parseTarget = (data: LinkBiteToMenuItemRequest | undefined): Target => {
  const menuItemId =
    typeof data?.menuItemId === 'string' ? data.menuItemId.trim() : '';
  const variantId =
    typeof data?.variantId === 'string' ? data.variantId.trim() : '';
  const notOnMenu = data?.notOnMenu === true;

  if (notOnMenu === !!menuItemId) {
    throw new HttpsError(
      'invalid-argument',
      'Name either a menuItemId or notOnMenu.',
    );
  }

  if (notOnMenu) {
    if (variantId) {
      throw new HttpsError(
        'invalid-argument',
        'A variantId needs a menuItemId.',
      );
    }

    return { kind: 'notOnMenu' };
  }

  return variantId
    ? { kind: 'item', menuItemId, variantId }
    : { kind: 'item', menuItemId };
};

interface StoredMenuItem {
  id?: unknown;
  variants?: { id?: unknown }[];
}

const findMenuItem = (
  menu: DocumentData | undefined,
  menuItemId: string,
): StoredMenuItem | undefined => {
  const categories = Array.isArray(menu?.['categories'])
    ? (menu['categories'] as { items?: StoredMenuItem[] }[])
    : [];

  return categories
    .flatMap((category) =>
      Array.isArray(category?.items) ? category.items : [],
    )
    .find((item) => item?.id === menuItemId);
};

/**
 * The one writer of an owner's link between a guest's Bite and a dish (GitHub
 * issue #2216).
 *
 * ## Why a callable and not a rules clause
 *
 * The rules let only a Bite's creator and an operator change it. An owner
 * linking a guest's Bite would be the first other writer, and four things
 * make the link right:
 *
 * 1. the caller holds the Bite's restaurant;
 * 2. the dish is on that restaurant's menu;
 * 3. the guest did not link the Bite themself, from an order or from the menu;
 * 4. nothing else on the Bite changes.
 *
 * Rules can check the first and the last. The second needs the dish inside an
 * array of categories in another document, which rules cannot search. So the
 * whole decision is taken here, in one transaction, and the Bite rules stay
 * exactly as narrow as they were.
 *
 * ## What it writes
 *
 * A link sets `menuItemId`, the `variantId` when one is named (and removes an
 * earlier one otherwise), `menuItemLinkedBy: 'owner'`, and clears
 * `menuLinkDismissed`. "Not on the menu" sets `menuLinkDismissed: true` and
 * removes any link verification or the owner made. Nothing the guest wrote
 * changes, and `updatedAt` is left alone: the Bite was not edited.
 *
 * `maintain-menu-item-stats` reacts to `menuItemId` changing, so the dish's
 * stats follow the link without anything here.
 */
export const linkBiteToMenuItemHandler = async (
  request: CallableRequest<LinkBiteToMenuItemRequest>,
): Promise<LinkBiteToMenuItemResult> => {
  const result = await linkInTransaction(request);

  // The trail decision 5 of the issue relies on: which account linked or
  // dismissed which guest's Bite, so a pattern such as dismissing only the
  // low ratings can be found later.
  logOperatorAction(request, {
    action: 'linkBiteToMenuItem',
    targetType: 'bite',
    targetId: result.biteId,
    outcome: 'succeeded',
    details: 'notOnMenu' in result ? { notOnMenu: true } : { ...result },
  });

  return result;
};

const linkInTransaction = async (
  request: CallableRequest<LinkBiteToMenuItemRequest>,
): Promise<LinkBiteToMenuItemResult> => {
  const actingUid = requireAnyRole(request, 'business', 'admin');
  const biteId = parseRequiredString(request.data?.biteId, 'biteId');
  const target = parseTarget(request.data);
  const db = getFirestore();
  const biteRef = db.collection(BITE_COLLECTION).doc(biteId);

  return db.runTransaction(async (transaction) => {
    const biteSnapshot = await transaction.get(biteRef);
    const bite = biteSnapshot.data();

    if (!biteSnapshot.exists || !bite) {
      throw new HttpsError('not-found', 'Bite was not found.');
    }

    const restaurantId =
      typeof bite['restaurantId'] === 'string' ? bite['restaurantId'] : '';

    if (!restaurantId) {
      throw new HttpsError(
        'failed-precondition',
        'This Bite names no restaurant.',
      );
    }

    const restaurantSnapshot = await transaction.get(
      db.collection(RESTAURANT_COLLECTION).doc(restaurantId),
    );
    const restaurant = restaurantSnapshot.data();

    if (!restaurantSnapshot.exists || !restaurant) {
      throw new HttpsError('not-found', 'Restaurant was not found.');
    }

    if (!holdsRestaurant(request, restaurant, actingUid)) {
      throw new HttpsError(
        'permission-denied',
        'This restaurant is not assigned to your account.',
      );
    }

    if (isLinkedByGuest(bite)) {
      throw new HttpsError(
        'failed-precondition',
        'The guest linked this Bite to a dish themself.',
      );
    }

    if (target.kind === 'notOnMenu') {
      transaction.update(biteRef, {
        menuLinkDismissed: true,
        menuItemId: FieldValue.delete(),
        variantId: FieldValue.delete(),
        menuItemLinkedBy: FieldValue.delete(),
      });

      return { biteId, notOnMenu: true as const };
    }

    const menuId =
      typeof restaurant['menuId'] === 'string' ? restaurant['menuId'] : '';
    const menuSnapshot = menuId
      ? await transaction.get(db.collection(MENU_COLLECTION).doc(menuId))
      : undefined;
    const item = findMenuItem(menuSnapshot?.data(), target.menuItemId);

    if (!item) {
      throw new HttpsError(
        'invalid-argument',
        "That dish is not on this restaurant's menu.",
      );
    }

    if (
      target.variantId &&
      !(item.variants ?? []).some((variant) => variant?.id === target.variantId)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'That dish has no such variant.',
      );
    }

    transaction.update(biteRef, {
      menuItemId: target.menuItemId,
      variantId: target.variantId ?? FieldValue.delete(),
      menuItemLinkedBy: 'owner',
      menuLinkDismissed: FieldValue.delete(),
    });

    return target.variantId
      ? { biteId, menuItemId: target.menuItemId, variantId: target.variantId }
      : { biteId, menuItemId: target.menuItemId };
  });
};

export const linkBiteToMenuItem = onAppCheck<LinkBiteToMenuItemRequest>(
  linkBiteToMenuItemHandler,
);
