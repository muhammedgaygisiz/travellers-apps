import { logger } from 'firebase-functions';
import {
  DocumentData,
  DocumentSnapshot,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { evaluateOpeningHours } from '../shared/utils/opening-hours';
import { withinScanRateLimit } from '../shared/utils/scan-rate-limit';
import { RESTAURANT_COLLECTION } from './restaurant-authority';
import {
  TABLE_TOKENS_COLLECTION,
  TABLES_COLLECTION,
  TOKEN_ALPHABET,
  TOKEN_LENGTH,
} from './table-qr-tokens';
import { TableScanResult, refuseScan } from './table-scan';

/**
 * Turns a scanned table QR code into an ordering context, or into a reason it
 * is not one (GitHub issue #1100).
 *
 * ## Why this exists when the token is already public
 *
 * `/tableTokens/{token}` is readable without a session, so the guest's phone
 * can already learn a restaurant id, a room id and a table label from the code
 * (issue #1086). That read is not a resolution and was never meant to be. Five
 * of the six things a scan has to establish live in documents a guest may not
 * read - the restaurant, the published table, the menu - and three of them
 * change without anything writing to the token: an assignment is revoked, the
 * kitchen pauses, the clock passes closing time. A client deciding for itself
 * would be deciding from a stale copy and its own wall clock.
 *
 * ## The order of the checks is the contract
 *
 * Several of these are false at once often enough to matter: a retired table at
 * a restaurant that closed for the season and let its assignment lapse fails
 * three of them. The guest gets one sentence, so which one has to be a decision
 * rather than an accident of how the conditions were nested. The order is the
 * one issue #1072 states, and it runs outside-in - the restaurant, then the
 * feature, then the table, then the code, then the clock, then the menu - so
 * the answer a guest gets is the largest true thing rather than the smallest.
 *
 * The token document is read before any of it, because it is what names the
 * restaurant, but its *status* is not judged until its own turn. That is not an
 * inconsistency: reading a document and believing it are different steps, and
 * telling a guest their code was replaced when the restaurant behind it no
 * longer exists would send them looking for a newer sticker that is not there.
 *
 * ## What it costs
 *
 * Five document reads at most - token, restaurant, table, then room and menu
 * together - and fewer on every refusal, because each check is reached only
 * once the one before it passed. The acceptance criterion is a single-digit
 * number of reads, and the reason it is worth holding is that this runs on
 * every scan of every table, including the scans that are somebody's script.
 *
 * ## Who may call it
 *
 * Anyone with a working App Check attestation and no session at all. A guest at
 * a table has no BiteTribe account and may never want one, and the scan is what
 * establishes which restaurant they would be signing in to - so requiring auth
 * here would make the account a precondition of finding out whether the
 * restaurant even takes orders. The classification is `public` in
 * `callable-authorization.spec.ts`.
 *
 * Nothing here is written. A scan resolves; starting or joining a session is
 * issue #1101, and it is where an unproven presence first costs the restaurant
 * anything.
 */

export const MENUS_COLLECTION = 'menus';
export const ROOMS_COLLECTION = 'rooms';

export interface ResolveTableQrTokenRequest {
  token?: unknown;
}

const getString = (data: DocumentData | undefined, field: string): string =>
  typeof data?.[field] === 'string' ? (data[field] as string) : '';

/**
 * The token as it is stored, from what the client sent.
 *
 * Upper-cased because the address on a printed sheet is
 * `https://bitetribe.app/t/{token}` and a guest who types one off the table
 * rather than scanning it has no reason to hold the shift key, while the
 * alphabet the token is drawn from is uppercase Crockford base32.
 *
 * Answers `undefined` for anything that is not shaped like a token, which
 * spares a read for every scan of a URL that was never one of ours. It is not a
 * security boundary - 130 bits is - it is the cheapest possible no.
 */
export const normalizeScannedToken = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const token = value.trim().toUpperCase();

  if (token.length !== TOKEN_LENGTH) {
    return undefined;
  }

  return [...token].every((character) => TOKEN_ALPHABET.includes(character))
    ? token
    : undefined;
};

/**
 * Whether the restaurant is one an order can reach.
 *
 * "Active" is not a field, and adding one would have been a third state nothing
 * writes. A restaurant is active when a business account holds it: an order
 * placed at a restaurant nobody holds lands in a queue no account can open, and
 * `claimStatus: 'revoked'` is exactly the case of a restaurant that used to be
 * able to take one and no longer can. `assignRestaurantOwner` and
 * `revokeRestaurantOwner` (issue #1077) are already the two decisions that move
 * it, so this reads the fact they write rather than a copy of it.
 */
const isRestaurantActive = (restaurant: DocumentData): boolean =>
  getString(restaurant, 'ownerUserId') !== '' &&
  restaurant['claimStatus'] !== 'revoked';

/**
 * Whether anything on the menu can be ordered today.
 *
 * An absent `isAvailable` reads as available, matching `isMenuItemAvailable` in
 * the model library: the flag was added after menus shipped, so an item nobody
 * has ever toggled is on the menu.
 *
 * Variants are not walked, and that is the whole rule rather than a shortcut.
 * Availability travels *down* in `isMenuVariantAvailable` - a dish that is off
 * takes its sizes with it - so a variant can never be orderable when its dish
 * is not, and a dish that is available already answers this question whether or
 * not it has sizes. Recursing would only re-find dishes that had already said
 * yes.
 *
 * An empty menu and a menu whose every dish is off both read as unavailable.
 * They are the same thing to a guest: a menu screen with nothing on it.
 */
const hasOrderableItem = (menu: DocumentData): boolean => {
  const categories = menu['categories'];

  if (!Array.isArray(categories)) {
    return false;
  }

  return categories.some((entry) => {
    const items = (entry as { items?: unknown } | null)?.items;

    return (
      Array.isArray(items) &&
      items.some(
        (item) =>
          (item as { isAvailable?: unknown } | null)?.isAvailable !== false,
      )
    );
  });
};

/** Who is asking, for the rate limiter. Never stored, never returned. */
const clientOf = (request: CallableRequest<unknown>): string =>
  request.auth?.uid ||
  (request.rawRequest as { ip?: string } | undefined)?.ip ||
  // Deliberately not the App Check app id: every install of the consumer app
  // shares one, so bucketing by it would throttle every guest in the product
  // the moment one of them looped.
  'unknown';

/**
 * The two documents only a resolved scan needs, in one round trip.
 *
 * The room is read for its name alone and its absence is not a refusal: a table
 * whose room was deleted is a table the guest is still sitting at, and "Sakura
 * Kitchen, table 12" without the room name is a worse confirmation than with it
 * rather than a wrong one.
 */
const readContext = async (
  restaurantId: string,
  roomId: string,
  menuId: string,
): Promise<{ room: DocumentSnapshot | undefined; menu: DocumentSnapshot }> => {
  const firestore = getFirestore();
  const menuRef = firestore.collection(MENUS_COLLECTION).doc(menuId);

  if (!roomId) {
    return { room: undefined, menu: await menuRef.get() };
  }

  const [room, menu] = await firestore.getAll(
    firestore
      .collection(RESTAURANT_COLLECTION)
      .doc(restaurantId)
      .collection(ROOMS_COLLECTION)
      .doc(roomId),
    menuRef,
  );

  return { room, menu };
};

/** The clock, injectable so the opening-hours cases are testable. */
export const resolveTableQrTokenHandler = async (
  request: CallableRequest<ResolveTableQrTokenRequest>,
  now: Date = new Date(),
): Promise<TableScanResult> => {
  const raw = request.data?.token;

  if (typeof raw !== 'string' || !raw.trim()) {
    throw new HttpsError('invalid-argument', 'A token is required.');
  }

  // Counted before the shape check, so a flood of malformed tokens costs the
  // sender its quota rather than nothing.
  if (
    !withinScanRateLimit({
      token: raw.trim().toUpperCase(),
      client: clientOf(request),
      now: now.getTime(),
    })
  ) {
    logger.warn('resolveTableQrToken: rate limit reached');

    throw new HttpsError(
      'resource-exhausted',
      'Too many scans. Try again in a moment.',
    );
  }

  const token = normalizeScannedToken(raw);

  if (!token) {
    return refuseScan('unknownToken');
  }

  const firestore = getFirestore();
  const tokenSnapshot = await firestore
    .collection(TABLE_TOKENS_COLLECTION)
    .doc(token)
    .get();

  if (!tokenSnapshot.exists) {
    return refuseScan('unknownToken');
  }

  const tokenData = tokenSnapshot.data() ?? {};
  const restaurantId = getString(tokenData, 'restaurantId');
  const tableId = getString(tokenData, 'tableId');
  const roomId = getString(tokenData, 'roomId');

  // Checked before the read rather than after it: the Admin SDK throws on an
  // empty document path, so a token document missing the field would be an
  // unhandled error instead of the refusal it plainly is.
  if (!restaurantId) {
    return refuseScan('restaurantNotFound');
  }

  const restaurantSnapshot = await firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .get();

  if (!restaurantSnapshot.exists) {
    return refuseScan('restaurantNotFound');
  }

  const restaurant = restaurantSnapshot.data() ?? {};

  if (!isRestaurantActive(restaurant)) {
    return refuseScan('restaurantInactive');
  }

  const tableOrdering = (restaurant['tableOrdering'] ?? {}) as DocumentData;

  if (tableOrdering['enabled'] !== true) {
    return refuseScan('tableOrderingDisabled');
  }

  if (!tableId) {
    return refuseScan('tableNotFound');
  }

  const tableSnapshot = await firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLES_COLLECTION)
    .doc(tableId)
    .get();

  // The published `tables` collection is what "is published" means: a table the
  // owner has only placed in a draft has no document here, and neither has one
  // that was removed from the plan. Reading the table rather than the token's
  // mirrored `tableEnabled` is the point - the mirror cannot say the table is
  // gone, only what it was when it was last written.
  if (!tableSnapshot.exists) {
    return refuseScan('tableNotFound');
  }

  const table = tableSnapshot.data() ?? {};

  if (table['enabled'] !== true) {
    return refuseScan('tableDisabled');
  }

  const status = getString(tokenData, 'status');

  if (status !== 'active') {
    return refuseScan(
      status === 'superseded' ? 'tokenSuperseded' : 'tokenRevoked',
    );
  }

  const pausedUntilTimestamp =
    typeof tableOrdering['pausedUntilTimestamp'] === 'number'
      ? (tableOrdering['pausedUntilTimestamp'] as number)
      : 0;

  if (pausedUntilTimestamp > now.getTime()) {
    return refuseScan('orderingPaused', { pausedUntilTimestamp });
  }

  const opening = evaluateOpeningHours(
    restaurant['openingHours'],
    tableOrdering['timeZone'],
    now,
  );

  if (!opening.open) {
    return refuseScan(
      'restaurantClosed',
      opening.reopensAt ? { reopensAt: opening.reopensAt } : {},
    );
  }

  const menuId = getString(restaurant, 'menuId');

  if (!menuId) {
    return refuseScan('menuMissing');
  }

  const { room, menu } = await readContext(restaurantId, roomId, menuId);

  if (!menu.exists) {
    return refuseScan('menuMissing');
  }

  if (!hasOrderableItem(menu.data() ?? {})) {
    return refuseScan('menuUnavailable');
  }

  const roomName = getString(room?.data(), 'name');
  const image = getString(restaurant, 'image');

  // Assembled field by field. The restaurant document carries `ownerUserId`
  // and the table document carries the geometry of a floor plan, and a guest
  // is entitled to neither - so nothing below is a spread of a document, and a
  // field added to one of them tomorrow does not reach a guest by accident.
  return {
    ok: true,
    token,
    restaurant: {
      id: restaurantId,
      name: getString(restaurant, 'name'),
      ...(image ? { image } : {}),
    },
    room: { id: roomId, ...(roomName ? { name: roomName } : {}) },
    table: {
      id: tableId,
      label: getString(table, 'label'),
      seats:
        typeof table['seats'] === 'number' ? (table['seats'] as number) : 0,
    },
    menu: { id: menuId },
  };
};

export const resolveTableQrToken = onAppCheck<ResolveTableQrTokenRequest>(
  (request) => resolveTableQrTokenHandler(request),
);
