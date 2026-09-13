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
import {
  RESTAURANT_COLLECTION,
  TABLES_COLLECTION,
} from './restaurant-authority';
import {
  TABLE_TOKENS_COLLECTION,
  TOKEN_ALPHABET,
  TOKEN_LENGTH,
} from './table-qr-tokens';
import {
  TableOrderingAvailability,
  TableScanResult,
  refuseScan,
} from './table-scan';

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
 * table, then the code, then the clock, then the menu - so the answer a guest
 * gets is the largest true thing rather than the smallest.
 *
 * Two checks left that sequence in issue #1102. Whether the restaurant offers
 * table ordering, and whether staff have paused it, no longer refuse anything:
 * they are read at the end into {@link orderingAvailability} and carried on a
 * scan that resolved, because neither is a reason to withhold a menu.
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
 *
 * ## Two callers, one set of checks
 *
 * {@link resolveScan} is the twelve checks on their own, and `startTableSession`
 * runs them again before it writes. That is not belt and braces. The client
 * holds the resolution this callable gave it for as long as the guest takes to
 * read the confirmation screen, and three of the checks move inside a service:
 * the kitchen pauses, the clock passes closing time, the owner turns the
 * feature off. Trusting the earlier answer would let a session start at a
 * restaurant that shut while the guest was deciding.
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

/**
 * Whether the guest may order here, and if not, why (GitHub issue #1102).
 *
 * These two conditions used to refuse the scan outright, and refusing them
 * meant a guest at a menu-only restaurant being told to ask a member of staff
 * instead of being shown the menu they had just scanned a code for. Neither is
 * a statement about whether there is anything to show: the restaurant is real,
 * the table is real, and the prices are the ones the guest wanted.
 *
 * `restaurantClosed` deliberately stayed a refusal. It says something about the
 * *restaurant* rather than about ordering, and a menu under a "closed" heading
 * reads as an invitation - with nobody on the premises to correct it, which is
 * exactly the difference from a pause.
 *
 * Disabled is read before paused, because a restaurant that never turned
 * ordering on has no meaningful pause: the field could hold anything, and
 * "not taking orders just now" would promise a resumption that is not coming.
 */
export const orderingAvailability = (
  tableOrdering: DocumentData,
  now: Date,
): TableOrderingAvailability => {
  if (tableOrdering['enabled'] !== true) {
    return { available: false, reason: 'tableOrderingDisabled' };
  }

  const pausedUntilTimestamp =
    typeof tableOrdering['pausedUntilTimestamp'] === 'number'
      ? (tableOrdering['pausedUntilTimestamp'] as number)
      : 0;

  return pausedUntilTimestamp > now.getTime()
    ? { available: false, reason: 'orderingPaused', pausedUntilTimestamp }
    : { available: true };
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

/**
 * What one scan established, for a caller that has to act on it.
 *
 * The restaurant document travels with the result because the caller that
 * writes - `startTableSession` - needs a field off it that no guest is entitled
 * to see, the idle timeout, and re-reading the same document a line later would
 * be a sixth read and a second version of the same instant.
 *
 * It is present only on a resolved scan. A refusal establishes nothing about a
 * restaurant, including on the two refusals that read one.
 */
export interface ScanResolution {
  result: TableScanResult;
  restaurant?: DocumentData;
}

/**
 * The twelve checks, with no rate limiting and no argument validation.
 *
 * Split out so `startTableSession` runs exactly this and not a paraphrase of
 * it. The two callers differ in what they do afterwards and must not differ in
 * what they check, and an order of checks that is "part of the contract" in one
 * file and re-derived in another is an order that will drift.
 *
 * The clock is a parameter so the opening-hours cases are testable.
 */
export const resolveScan = async (
  raw: unknown,
  now: Date,
): Promise<ScanResolution> => {
  const token = normalizeScannedToken(raw);

  if (!token) {
    return { result: refuseScan('unknownToken') };
  }

  const firestore = getFirestore();
  const tokenSnapshot = await firestore
    .collection(TABLE_TOKENS_COLLECTION)
    .doc(token)
    .get();

  if (!tokenSnapshot.exists) {
    return { result: refuseScan('unknownToken') };
  }

  const tokenData = tokenSnapshot.data() ?? {};
  const restaurantId = getString(tokenData, 'restaurantId');
  const tableId = getString(tokenData, 'tableId');
  const roomId = getString(tokenData, 'roomId');

  // Checked before the read rather than after it: the Admin SDK throws on an
  // empty document path, so a token document missing the field would be an
  // unhandled error instead of the refusal it plainly is.
  if (!restaurantId) {
    return { result: refuseScan('restaurantNotFound') };
  }

  const restaurantSnapshot = await firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .get();

  if (!restaurantSnapshot.exists) {
    return { result: refuseScan('restaurantNotFound') };
  }

  const restaurant = restaurantSnapshot.data() ?? {};

  if (!isRestaurantActive(restaurant)) {
    return { result: refuseScan('restaurantInactive') };
  }

  const tableOrdering = (restaurant['tableOrdering'] ?? {}) as DocumentData;

  if (!tableId) {
    return { result: refuseScan('tableNotFound') };
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
    return { result: refuseScan('tableNotFound') };
  }

  const table = tableSnapshot.data() ?? {};

  if (table['enabled'] !== true) {
    return { result: refuseScan('tableDisabled') };
  }

  const status = getString(tokenData, 'status');

  if (status !== 'active') {
    return {
      result: refuseScan(
        status === 'superseded' ? 'tokenSuperseded' : 'tokenRevoked',
      ),
    };
  }

  const opening = evaluateOpeningHours(
    restaurant['openingHours'],
    tableOrdering['timeZone'],
    now,
  );

  if (!opening.open) {
    return {
      result: refuseScan(
        'restaurantClosed',
        opening.reopensAt ? { reopensAt: opening.reopensAt } : {},
      ),
    };
  }

  const menuId = getString(restaurant, 'menuId');

  if (!menuId) {
    return { result: refuseScan('menuMissing') };
  }

  const { room, menu } = await readContext(restaurantId, roomId, menuId);

  if (!menu.exists) {
    return { result: refuseScan('menuMissing') };
  }

  if (!hasOrderableItem(menu.data() ?? {})) {
    return { result: refuseScan('menuUnavailable') };
  }

  const roomName = getString(room?.data(), 'name');
  const image = getString(restaurant, 'image');
  const ordering = orderingAvailability(tableOrdering, now);

  // Assembled field by field. The restaurant document carries `ownerUserId`
  // and the table document carries the geometry of a floor plan, and a guest
  // is entitled to neither - so nothing below is a spread of a document, and a
  // field added to one of them tomorrow does not reach a guest by accident.
  return {
    result: {
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
      ordering,
    },
    restaurant,
  };
};

/**
 * A token argument that is present and looks like it could be one.
 *
 * Shared with `startTableSession`, which takes the same field and has to refuse
 * an absent one the same way: an empty `token` is a client that did not send
 * one, which is a bug in the caller rather than a scan of anything, so it is an
 * `invalid-argument` failure and not one of the twelve refusals.
 */
export const parseScannedToken = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', 'A token is required.');
  }

  return value.trim().toUpperCase();
};

/**
 * The rate-limit gate both scan callables pass through.
 *
 * Counted before the shape check, so a flood of malformed tokens costs the
 * sender its quota rather than nothing. The two callables share one bucket per
 * token and per client on purpose: a loop that alternates between them is the
 * same loop, and two buckets would double what it is allowed.
 */
export const assertWithinScanRateLimit = (
  request: CallableRequest<unknown>,
  token: string,
  now: Date,
  callable: string,
): void => {
  if (
    withinScanRateLimit({
      token,
      client: clientOf(request),
      now: now.getTime(),
    })
  ) {
    return;
  }

  logger.warn(`${callable}: rate limit reached`);

  throw new HttpsError(
    'resource-exhausted',
    'Too many scans. Try again in a moment.',
  );
};

/** The clock, injectable so the opening-hours cases are testable. */
export const resolveTableQrTokenHandler = async (
  request: CallableRequest<ResolveTableQrTokenRequest>,
  now: Date = new Date(),
): Promise<TableScanResult> => {
  const raw = parseScannedToken(request.data?.token);

  assertWithinScanRateLimit(request, raw, now, 'resolveTableQrToken');

  return (await resolveScan(raw, now)).result;
};

export const resolveTableQrToken = onAppCheck<ResolveTableQrTokenRequest>(
  (request) => resolveTableQrTokenHandler(request),
);
