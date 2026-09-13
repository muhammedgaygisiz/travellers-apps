import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { RESTAURANT_COLLECTION } from '../restaurants/restaurant-authority';
import { MENUS_COLLECTION } from '../restaurants/resolve-table-qr-token';
import { backfillMenuIds, StoredMenuCategory } from '../shared/utils/menu-ids';

/**
 * A restaurant's menu, read by somebody with no BiteTribe account
 * (GitHub issue #1102).
 *
 * ## Why a callable rather than a public read rule
 *
 * A menu page needs two documents and neither is readable without a session.
 * Opening `/menus/{menuId}` would be defensible on its own - a menu is
 * information a restaurant wants read - but the page cannot render without a
 * restaurant name, and `/restaurants/{id}` carries `ownerUserId`, `claimStatus`
 * and the whole `tableOrdering` configuration. Issue #1102's own criterion is
 * that the public path exposes the menu and not restaurant operations data, so
 * the restaurant half is assembled field by field here, exactly as
 * `resolveTableQrToken` assembles its context. A field added to that document
 * tomorrow does not reach a stranger by accident.
 *
 * ## Why it takes a restaurant and not a token
 *
 * Because the second entry point is a link a restaurant publishes, and such a
 * restaurant may have no floor plan and no printed codes at all - which is the
 * issue's "enabling menu-only mode requires no floor plan". A token scopes the
 * *table* context; it never scoped the menu, and once a menu link exists,
 * pretending otherwise would be theatre.
 *
 * ## Who may call it
 *
 * Anyone with a working App Check attestation and no session, like
 * `resolveTableQrToken`. That is the whole point: issues #370 and #371 are
 * about reading a menu without an account and without installing anything.
 * Classified `public` in `callable-authorization.spec.ts`.
 *
 * It writes nothing. The menu is passed through the id backfill on the way out,
 * so a menu written before issue #1099 renders by id here like any other - but
 * those ids are not persisted, because a public read has no business writing to
 * a restaurant's menu. The owner's next save persists them.
 */

export interface LoadPublicMenuRequest {
  restaurantId?: unknown;
}

export type PublicMenuRefusalReason =
  'restaurantNotFound' | 'restaurantInactive' | 'menuMissing' | 'menuEmpty';

export interface PublicMenuResolved {
  ok: true;
  restaurant: { id: string; name: string; image?: string };
  menu: DocumentData;
}

export interface PublicMenuRefused {
  ok: false;
  reason: PublicMenuRefusalReason;
}

export type PublicMenuResult = PublicMenuResolved | PublicMenuRefused;

const refuse = (reason: PublicMenuRefusalReason): PublicMenuRefused => ({
  ok: false,
  reason,
});

const getString = (data: DocumentData | undefined, field: string): string =>
  typeof data?.[field] === 'string' ? (data[field] as string) : '';

/**
 * Whether the restaurant is one whose menu may be published under its name.
 *
 * The same rule the scan applies, and it survives the absence of ordering for a
 * different reason: an unheld restaurant's menu is whatever was derived from
 * other people's Bites, and putting that on a public page under the
 * restaurant's name states prices nobody there ever confirmed.
 */
const isRestaurantActive = (restaurant: DocumentData): boolean =>
  getString(restaurant, 'ownerUserId') !== '' &&
  restaurant['claimStatus'] !== 'revoked';

/**
 * Whether there is anything written on this menu to read.
 *
 * Deliberately weaker than the scan's `menuUnavailable`, which asks whether
 * anything can be *ordered* today. A menu whose every dish is marked off cannot
 * be ordered from and is still worth reading, so this asks only whether a
 * category anywhere has an item in it.
 */
const hasReadableContent = (menu: DocumentData): boolean => {
  const categories = menu['categories'];

  return (
    Array.isArray(categories) &&
    categories.some((entry) => {
      const items = (entry as { items?: unknown } | null)?.items;

      return Array.isArray(items) && items.length > 0;
    })
  );
};

export const loadPublicMenuHandler = async (
  request: CallableRequest<LoadPublicMenuRequest>,
): Promise<PublicMenuResult> => {
  const restaurantId =
    typeof request.data?.restaurantId === 'string'
      ? request.data.restaurantId.trim()
      : '';

  if (!restaurantId) {
    throw new HttpsError('invalid-argument', 'A restaurantId is required.');
  }

  const firestore = getFirestore();
  const restaurantSnapshot = await firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .get();

  if (!restaurantSnapshot.exists) {
    return refuse('restaurantNotFound');
  }

  const restaurant = restaurantSnapshot.data() ?? {};

  if (!isRestaurantActive(restaurant)) {
    return refuse('restaurantInactive');
  }

  const menuId = getString(restaurant, 'menuId');

  if (!menuId) {
    return refuse('menuMissing');
  }

  const menuSnapshot = await firestore
    .collection(MENUS_COLLECTION)
    .doc(menuId)
    .get();

  if (!menuSnapshot.exists) {
    return refuse('menuMissing');
  }

  const menu = menuSnapshot.data() ?? {};

  if (!hasReadableContent(menu)) {
    return refuse('menuEmpty');
  }

  const image = getString(restaurant, 'image');
  const currency = getString(menu, 'currency');
  const { categories } = backfillMenuIds(
    menu['categories'] as StoredMenuCategory[] | undefined,
  );

  // Assembled field by field on both halves. The restaurant document carries
  // ownership and ordering configuration and the menu document carries
  // timestamps and a `restaurantId` a reader has no use for, so nothing below
  // is a spread of a document.
  return {
    ok: true,
    restaurant: {
      id: restaurantId,
      name: getString(restaurant, 'name'),
      ...(image ? { image } : {}),
    },
    menu: {
      id: menuId,
      categories,
      // Absent stays absent. A menu that has never stated its currency renders
      // bare numbers, which a reader can ask about - unlike a symbol the
      // product guessed, which they would believe.
      ...(currency ? { currency } : {}),
    },
  };
};

export const loadPublicMenu = onAppCheck<LoadPublicMenuRequest>((request) =>
  loadPublicMenuHandler(request),
);
