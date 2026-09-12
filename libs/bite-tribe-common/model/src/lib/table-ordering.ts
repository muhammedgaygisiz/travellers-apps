import type { DaySchedule } from './opening-hours';

/**
 * What a scanned table QR code has to be checked against, and what the check
 * answers with (GitHub issue #1100).
 *
 * ## Why a scan is a backend question
 *
 * `/tableTokens/{token}` is the one collection an unauthenticated client may
 * read (issue #1086), so a guest's phone can already turn a code into a
 * restaurant id, a room id and a table label. That is deliberately all it can
 * do. Everything the guest actually needs to know - is this restaurant still
 * ours, does it take orders at the table, is it open right now, is there a menu
 * to order from - lives in documents a guest may not read, and three of the six
 * answers change without the token document being touched.
 *
 * So the token read is not the resolution. `resolveTableQrToken` is, and it is
 * the only thing that says a scan is good.
 *
 * ## Why the refusal is a value and not an error
 *
 * A scan fails for six different reasons that call for six different sentences
 * and three different next steps, and a guest who is told "something went
 * wrong" at a table will put their phone away. Callable errors carry a code
 * from a fixed list of sixteen that says nothing about restaurants, so a
 * distinct reason would have had to travel in a free-form `details` bag that no
 * type describes.
 *
 * {@link TableScanRefusalReason} is that reason, as a closed set the client
 * switches over exhaustively. A refusal is an ordinary outcome of a working
 * endpoint - the code on the table of a restaurant that closed an hour ago is
 * not an error, it is a "we are shut".
 *
 * The backend keeps its own copy of the reason list, for the reason given in
 * `apps/bite-tribe-firebase/functions/src/functions/restaurants/table-scan.ts`,
 * and `table-scan-parity.spec.ts` fails the build when the two disagree. A
 * reason the client has no sentence for renders as nothing at all, which is the
 * blank screen this whole type exists to prevent.
 */

/**
 * How a restaurant configures ordering from the table.
 *
 * Absent on every restaurant until an owner turns it on, and absent reads as
 * off. Ordering at the table is an opt-in the restaurant makes a commitment
 * with - somebody has to watch the queue and carry the food - so a restaurant
 * that has never been asked must refuse the scan rather than start taking
 * orders nobody is reading.
 */
export interface TableOrderingSettings {
  /**
   * Whether the restaurant offers ordering from the table at all.
   *
   * The configuration half of "can this guest order", answered once by the
   * owner. Whether they can order *right now* is {@link pausedUntilTimestamp}
   * and the opening hours, which are the operational half and move during a
   * service.
   */
  enabled: boolean;
  /**
   * The IANA time zone `Restaurant.openingHours` are written in, such as
   * `Europe/Berlin`.
   *
   * Required, and required *here* rather than on the restaurant, because this
   * is the first reader that has to turn "18:00 to 23:00 on Friday" into an
   * instant. A schedule without a zone is not a schedule: the server runs in
   * UTC, so evaluating one without this would tell a guest in Jakarta that a
   * restaurant open until eleven closed at four in the afternoon.
   *
   * A zone rather than a fixed offset, so the twice-yearly hour is the zone
   * database's problem and not the restaurant's.
   */
  timeZone: string;
  /**
   * When a staff-side pause on new orders ends, in epoch milliseconds. Absent
   * when nothing is paused.
   *
   * The kitchen is swamped, the card terminal is down, a coach party has just
   * walked in. This stops new scans resolving without the owner turning the
   * feature off and forgetting to turn it back on, which is what a plain
   * boolean would have produced.
   *
   * An end rather than a flag, so the pause lapses on its own: the worst case
   * is a restaurant that starts taking orders again by itself, and the worst
   * case of a flag is one that never does.
   */
  pausedUntilTimestamp?: number;
}

/**
 * Why a scan was refused. One member per rule the backend checks, in the order
 * the checks run.
 *
 * The order is part of the contract. Several of these can be true at once - a
 * retired table at a restaurant that closed and let its assignment lapse - and
 * the guest gets exactly one sentence, so which one they get has to be decided
 * once here rather than by whichever condition an implementation happened to
 * test first.
 */
export const TABLE_SCAN_REFUSAL_REASONS = [
  /** No token document. A code that was never ours, or a mistyped URL. */
  'unknownToken',
  /** The restaurant the token names is gone. */
  'restaurantNotFound',
  /**
   * The restaurant is not currently held by a business account.
   *
   * Never assigned, or assignment revoked. Either way nobody is on the other
   * end of an order, and the orders would sit in a queue no account can open.
   */
  'restaurantInactive',
  /** The restaurant does not offer ordering from the table. */
  'tableOrderingDisabled',
  /**
   * No table document under the restaurant.
   *
   * A table that was removed from the plan, or one that only ever existed in
   * an unpublished draft - the published `tables` collection is what "is
   * published" means, so both read the same and both mean the same thing to
   * the guest: the sticker in front of them names nothing.
   */
  'tableNotFound',
  /** The table exists and the owner has taken it out of service. */
  'tableDisabled',
  /**
   * A newer code has been printed for this table.
   *
   * The only reason whose next step is to look at the table again: there is a
   * working code, and it is the one the guest is not holding.
   */
  'tokenSuperseded',
  /** The code was withdrawn. A retired table, or a code that leaked. */
  'tokenRevoked',
  /** Staff have paused new orders. */
  'orderingPaused',
  /** The restaurant is outside its opening hours. */
  'restaurantClosed',
  /** The restaurant has no menu document. */
  'menuMissing',
  /** The menu exists and has nothing on it that can be ordered today. */
  'menuUnavailable',
] as const;

export type TableScanRefusalReason =
  (typeof TABLE_SCAN_REFUSAL_REASONS)[number];

/**
 * What the guest can usefully do about a refusal.
 *
 * Three, because a guest at a table has three options and no more: speak to
 * somebody, come back later, or look at the table again. The field exists so
 * the next step is decided next to the reason it belongs to, rather than by a
 * screen that has to re-derive it from twelve cases and will eventually offer
 * "try again later" to a guest holding a superseded code.
 */
export type TableScanNextStep =
  /** A person at the restaurant can sort this out, or simply take the order. */
  | 'askStaff'
  /** Nothing is wrong; the restaurant is not taking orders at this moment. */
  | 'tryLater'
  /** There is a working code on this table and this is not it. */
  | 'rescanCode';

/** When a closed restaurant next opens, as the schedule states it. */
export interface TableScanReopensAt {
  day: DaySchedule['day'];
  /** `HH:mm`, in the restaurant's own {@link TableOrderingSettings.timeZone}. */
  time: string;
}

/**
 * The ordering context a good scan resolves to.
 *
 * Assembled field by field rather than by handing back the documents it was
 * read from. `/restaurants/{id}` carries `ownerUserId`, the table document
 * carries the geometry of a floor plan, and a guest is entitled to neither -
 * the acceptance criterion of issue #1100 is that the response contains no
 * data the guest should not see, and the only way to keep that true as those
 * documents grow is for nothing here to be a spread.
 */
export interface TableScanContext {
  /** The token that resolved, echoed so a client can key a session by it. */
  token: string;
  restaurant: {
    id: string;
    name: string;
    /** Download URL of the restaurant's picture, where it has one. */
    image?: string;
  };
  /** Where the table stands. `name` is absent when the room has been deleted. */
  room: { id: string; name?: string };
  table: {
    id: string;
    /** The number or name printed on the table, such as `12` or `Terrace 3`. */
    label: string;
    seats: number;
  };
  /**
   * The menu to order from.
   *
   * The id alone. Delivering the menu itself to a guest with no account is
   * issue #1102, and a scan that carried it would make every refused scan pay
   * for a document the guest never sees.
   */
  menu: { id: string };
}

/** A scan that resolved. */
export interface TableScanResolved extends TableScanContext {
  ok: true;
}

/** A scan that was refused, and why. */
export interface TableScanRefused {
  ok: false;
  reason: TableScanRefusalReason;
  nextStep: TableScanNextStep;
  /** On `orderingPaused`, when the pause ends. Epoch milliseconds. */
  pausedUntilTimestamp?: number;
  /** On `restaurantClosed`, when the restaurant next opens. */
  reopensAt?: TableScanReopensAt;
}

/** What `resolveTableQrToken` answers with. */
export type TableScanResult = TableScanResolved | TableScanRefused;

/** What the client sends. */
export interface ResolveTableQrTokenRequest {
  token: string;
}

/**
 * The next step each reason calls for. The single definition.
 *
 * Data rather than a `switch`, so the pairing is one table a reviewer reads in
 * one place, and so the backend and any screen rendering a refusal cannot
 * disagree about what to offer.
 */
export const TABLE_SCAN_NEXT_STEPS: Readonly<
  Record<TableScanRefusalReason, TableScanNextStep>
> = {
  unknownToken: 'askStaff',
  restaurantNotFound: 'askStaff',
  restaurantInactive: 'askStaff',
  tableOrderingDisabled: 'askStaff',
  tableNotFound: 'askStaff',
  tableDisabled: 'askStaff',
  tokenSuperseded: 'rescanCode',
  tokenRevoked: 'askStaff',
  orderingPaused: 'tryLater',
  restaurantClosed: 'tryLater',
  menuMissing: 'askStaff',
  menuUnavailable: 'askStaff',
} as const;

/** Whether an unknown value is a refusal reason this model knows. */
export const isTableScanRefusalReason = (
  value: unknown,
): value is TableScanRefusalReason =>
  typeof value === 'string' &&
  (TABLE_SCAN_REFUSAL_REASONS as readonly string[]).includes(value);

/**
 * Whether a scan resolved, as a type guard.
 *
 * One function rather than an `ok === true` at each call site, so a screen
 * narrows the union instead of reaching into a field that is only sometimes
 * there.
 */
export const isTableScanResolved = (
  result: TableScanResult,
): result is TableScanResolved => result.ok;
