import type { Geopoint } from './geopoint';

/**
 * What the restaurant is told about scans that do not look ordinary
 * (GitHub issue #1107).
 *
 * ## Why this exists at all
 *
 * The premise of this epic is that a QR code is not a secret. It is glued to a
 * table in a public room, it gets photographed, and it ends up on the internet
 * - `RD-TS-1` is the answer to what that costs, and the answer is "one row on a
 * screen". This file is the other half of the same sentence: the row.
 *
 * Every protection around the code either refuses something or throttles
 * something, and both are invisible to the people the restaurant is run by. A
 * limiter that silently absorbs ten thousand resolutions of one table's token
 * has done its job and told nobody that the sticker on table 12 is on somebody's
 * feed. An anomaly is what makes it sayable: the restaurant sees that the code
 * is being worked on, and has one action - rotate it - that ends it.
 *
 * ## Why it is a table signal and not a log
 *
 * ```text
 * /restaurants/{restaurantId}/scanAnomalies/{n}_{tableId}_{kind}
 * ```
 *
 * The address is `RD-TS-18`'s, and it is chosen for the same three reasons a
 * call for a waiter is named after the table and the kind.
 *
 * **The collection is bounded by the room.** {@link SCAN_ANOMALY_KINDS} entries
 * per table, forever. A staff screen reads the whole of it with no `where`, no
 * composite index and no collection-group rule, and a restaurant under a
 * sustained attack has exactly the same number of documents as one that is not.
 * A log would have grown with the attack, which is a denial of service wearing
 * the costume of a security feature.
 *
 * **A repeat joins the signal that is up.** The thousandth resolution of a
 * photographed token addresses the document the first one wrote. That is what
 * makes writing one safe on a path an attacker controls the frequency of.
 *
 * **What it costs is history**, and history is the wrong thing to keep here.
 * "Table 12's code was being hammered on the 3rd of March" is a question for
 * the function logs, which already have it; the dining room's question is
 * whether it is happening now.
 *
 * ## What an anomaly never does
 *
 * It never refuses anything. Every kind below is raised *beside* a decision
 * that was already taken on its own grounds - a refused scan, a throttled
 * resolution, a session that started normally. Nothing reads an anomaly back to
 * decide anything, which is what keeps the coarse location of
 * {@link ScanPosition} an additional signal rather than a gate, and what makes
 * a wrong one cost a restaurant a dismissed row rather than a guest a meal.
 */

/**
 * The kinds of scan the restaurant is shown.
 *
 * A closed set for the reason the refusal reasons are one: each of these is a
 * different sentence on a staff screen and a different thing to do about it,
 * and "unusual activity" on a table is a row nobody can act on.
 *
 * They divide into two halves that are worth keeping apart when reading them.
 * {@link SCAN_ANOMALY_KINDS} has three kinds raised by a scan that was
 * *refused* - the refusal already happened, and the row says the refusals are
 * piling up on one table - and two raised beside a session that started
 * perfectly normally, where nothing was refused and the row is the only thing
 * that exists at all.
 */
export const SCAN_ANOMALY_KINDS = [
  /**
   * Resolutions of this table's token crossed the durable limit.
   *
   * The one kind that says "somebody is running this in a loop" rather than
   * "somebody scanned something odd". It is raised once per window per table,
   * on the request that crosses the line, so a flood is one row rather than a
   * row per request - see {@link SCAN_ANOMALY_QUIET_MS}.
   */
  'rateLimited',
  /**
   * The code was scanned while the restaurant was shut.
   *
   * A scan outside opening hours is already refused with `restaurantClosed`,
   * so the guest was told and nothing was written. What makes it worth a row
   * is repetition: one scan at ten past closing is somebody who walked up to a
   * locked door, and forty overnight is a code that is being worked through by
   * somebody who is not standing anywhere near the table.
   */
  'outsideOpeningHours',
  /**
   * The code was scanned at a table that is out of service.
   *
   * `tableDisabled` refuses it. The row exists because a disabled table is one
   * whose sticker the restaurant believes it has taken out of circulation, and
   * scans arriving at it are evidence that it has not - a sheet that was never
   * thrown away, or a photograph that outlived the table.
   */
  'disabledTable',
  /**
   * More live sessions on one table than the table can seat.
   *
   * Nothing was refused: every one of those sessions is legitimate on its own
   * terms, and several phones at one table is the normal case this epic was
   * built for. The threshold is {@link manySessionsThreshold}, and it is set
   * where a party stops being explicable by the furniture.
   */
  'manySessions',
  /**
   * The guest consented to share a coarse position, and it is not here.
   *
   * The only kind that depends on something the guest chose to give, and
   * therefore the only one that is absent for most scans - a guest who
   * declines produces no row and is not treated as more suspicious for
   * declining. See {@link ScanPosition}.
   */
  'distantScan',
] as const;

export type ScanAnomalyKind = (typeof SCAN_ANOMALY_KINDS)[number];

/**
 * Every status an anomaly can hold.
 *
 * Two, and the second one is the whole interaction. A member of staff reads a
 * row, decides it is explicable - or rotates the code, which is the action the
 * row exists to prompt - and dismisses it. There is no "resolved" separate from
 * that, because nothing here is a task with an outcome; it is a thing the
 * restaurant has now been told.
 *
 * A dismissed anomaly stays at its derived name rather than being deleted, so a
 * kind that starts up again after being dismissed is the same document coming
 * back to `open` with its `count` intact, rather than a fresh row that has
 * forgotten it happened before.
 */
export const SCAN_ANOMALY_STATUSES = ['open', 'dismissed'] as const;

export type ScanAnomalyStatus = (typeof SCAN_ANOMALY_STATUSES)[number];

/** The status every anomaly is raised in. */
export const INITIAL_SCAN_ANOMALY_STATUS: ScanAnomalyStatus = 'open';

/** One subcollection per restaurant, beside the signals and the live states. */
export const SCAN_ANOMALIES_COLLECTION = 'scanAnomalies';

/**
 * The document name for one kind of anomaly at one table.
 *
 * Derived rather than generated, which is what bounds the collection - see the
 * note at the top of this file. The leading length is what makes the derivation
 * injective, for the reason `tableSessionId` and `tableAssistanceRequestId`
 * each carry one: without it a table called `x_rateLimited` and a table called
 * `x` would collide on one name. No kind contains an underscore, so the length
 * of the table id is enough to split the name back apart.
 */
export const scanAnomalyId = (tableId: string, kind: ScanAnomalyKind): string =>
  `${tableId.length}_${tableId}_${kind}`;

/**
 * How long after raising one anomaly the same table and kind writes again.
 *
 * The bound on what the *writer* costs, and it has to exist because the one
 * thing an attacker fully controls is how often they call. Without it, a loop
 * against a photographed token would turn every refusal into a Firestore write,
 * which is a worse outcome than the loop it was meant to report.
 *
 * A minute, which is also `TABLE_ASSISTANCE_COOLDOWN_MS`, and for a
 * related reason: it is roughly the resolution at which a human reading a
 * screen notices anything change.
 *
 * What it costs is that {@link ScanAnomaly.count} counts *raisings* and not
 * requests - forty thousand resolutions inside one minute are one. That is the
 * honest number to show and the row says so: the question the count answers is
 * "how many separate times has this table come up", and the magnitude of any
 * one burst is a question for the function logs.
 */
export const SCAN_ANOMALY_QUIET_MS = 60_000;

/**
 * The fewest live sessions on a table that can ever be an anomaly.
 *
 * A floor under {@link manySessionsThreshold}, because a two-seat table with
 * three phones at it is a couple and a friend who pulled up a chair, and a
 * product that calls that suspicious is a product staff stop reading. Six is
 * chosen as the point past which the furniture stops explaining it whatever the
 * table's size, including for the tables whose `seats` nobody ever filled in.
 */
export const MIN_SESSIONS_BEFORE_ANOMALY = 6;

/**
 * How many live sessions one table may hold before it is worth a row.
 *
 * The table's own capacity, never below {@link MIN_SESSIONS_BEFORE_ANOMALY}. A
 * function of the seats rather than one number for the restaurant, because the
 * signal is "more people are ordering here than could be sitting here" and a
 * dining room has two-tops and twelve-tops in it.
 *
 * Exceeding it is the anomaly, so a table of four with four sessions is
 * ordinary and one with seven is not.
 */
export const manySessionsThreshold = (seats: number): number =>
  Math.max(
    Number.isFinite(seats) && seats > 0 ? seats : 0,
    MIN_SESSIONS_BEFORE_ANOMALY,
  );

/**
 * A coarse position the guest chose to share when they scanned
 * (GitHub issue #1107).
 *
 * ## Optional, in the strong sense
 *
 * Nothing branches on it. A guest who declines the permission, whose device has
 * no fix, or who is indoors under a roof that blocks one, starts exactly the
 * same session, sees exactly the same menu and places exactly the same order as
 * a guest who allows it. The only difference a position can make is whether a
 * row appears on a screen the guest never sees.
 *
 * That is what "never as the sole gate" has to mean in code. A check that is
 * optional but denies something when present is not optional; it is a gate with
 * an opt-out, and the people it would lock out - a basement dining room, an old
 * phone, somebody who says no to permissions on principle - are not the people
 * photographing stickers.
 *
 * ## Why the coordinates are not stored
 *
 * They are sent, compared to the restaurant's own position, and discarded. What
 * survives is {@link ScanAnomaly.distanceMeters}, rounded, and only on the
 * scans far enough away to be worth a row.
 *
 * A guest's coordinates are the most sensitive thing this flow ever handles,
 * and a document holding them would be readable by every member of staff at the
 * restaurant through `readsFloorPlan` - which is a reasonable rule for "table 12
 * is calling" and an unreasonable one for "this guest was at this latitude".
 * The distance answers the only question the restaurant has.
 *
 * ## Accuracy is carried and is not a filter
 *
 * A fix good to two kilometres cannot support a claim that somebody is five
 * hundred metres away, so {@link isDistantScan} requires the distance to exceed
 * the threshold *and* the accuracy, and a fix too coarse to say anything says
 * nothing. Discarding coarse fixes instead would have been the same rule with
 * the reason hidden inside it.
 */
export interface ScanPosition {
  latitude: number;
  longitude: number;
  /**
   * The radius the device claims the fix is good to, in metres.
   *
   * From `Geolocation.getCurrentPosition`'s `coords.accuracy`, which every
   * platform reports and none of them reports well. Treated as a lower bound on
   * how wrong the fix might be and never as a reason to refuse one.
   */
  accuracyMeters: number;
}

/**
 * How far a consented scan has to be from the restaurant to be worth a row.
 *
 * Five hundred metres, which is generous on purpose. The number has to survive
 * a city-centre fix bouncing off buildings, a restaurant pin dropped on the
 * street rather than the kitchen, and a guest sitting in a courtyard on the far
 * side of the block - and the thing it is looking for is not a guest who is
 * slightly outside, it is a code being scanned from a different postcode.
 *
 * A false row costs a member of staff a dismissal. A threshold tight enough to
 * produce them regularly costs the restaurant its willingness to read the list,
 * which costs it every other kind too.
 */
export const DISTANT_SCAN_METERS = 500;

/** The mean radius of the Earth in metres, for {@link scanDistanceMeters}. */
const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * The great-circle distance between a scan and its restaurant, in metres.
 *
 * Haversine on a sphere, which is wrong by up to about half a percent against
 * the real ellipsoid - three metres in five hundred. The threshold it feeds is
 * a five-hundred-metre judgement about whether somebody is in the building, so
 * the error is four orders of magnitude below the decision, and a geodesic
 * library for it would be a dependency bought with nothing.
 */
export const scanDistanceMeters = (
  scan: Pick<ScanPosition, 'latitude' | 'longitude'>,
  restaurant: Pick<Geopoint, 'latitude' | 'longitude'>,
): number => {
  const deltaLatitude = toRadians(restaurant.latitude - scan.latitude);
  const deltaLongitude = toRadians(restaurant.longitude - scan.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(scan.latitude)) *
      Math.cos(toRadians(restaurant.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Whether a consented position is far enough away to raise a row.
 *
 * Both conditions, and the accuracy one is the half that keeps this honest: a
 * device reporting a kilometre of uncertainty cannot support a five-hundred
 * metre claim, so it makes none. See {@link ScanPosition}.
 */
export const isDistantScan = (
  distanceMeters: number,
  accuracyMeters: number,
): boolean =>
  distanceMeters > DISTANT_SCAN_METERS &&
  distanceMeters > (Number.isFinite(accuracyMeters) ? accuracyMeters : 0);

/** One table's unusual scan, as the restaurant reads it. */
export interface ScanAnomaly {
  /** Equal to the document id, which is {@link scanAnomalyId}. */
  id: string;
  /** The owning restaurant, repeated from the path so a reader can trust it. */
  restaurantId: string;
  /** The table the code belongs to. The anomaly is about this, not a party. */
  tableId: string;
  /**
   * The table's number as staff call it, copied at the moment it was raised.
   *
   * A copy for the reason `TableQrToken` copies three fields off the table: a
   * row naming a table id is a row nobody can walk to, and the staff screen
   * that draws it would otherwise have to join against a collection it may be
   * reading before the plan has arrived. It goes stale when a table is
   * renumbered, which costs a dismissed row the wrong number and is worth less
   * than the join.
   */
  tableLabel: string;
  kind: ScanAnomalyKind;
  status: ScanAnomalyStatus;
  /** When this kind was first seen at this table, in epoch milliseconds. */
  firstSeenAt: number;
  /** The most recent raising. What the row's age is read from. */
  lastSeenAt: number;
  /**
   * How many times it has been raised, not how many requests caused it.
   *
   * Bursts inside {@link SCAN_ANOMALY_QUIET_MS} are one raising. See that
   * constant for why the honest number is the smaller one.
   */
  count: number;
  /**
   * How far the consented scan was from the restaurant, rounded to metres.
   *
   * `distantScan` only, and the only thing that survives of a position the
   * guest shared - see {@link ScanPosition}.
   */
  distanceMeters?: number;
  /** Live sessions on the table when it was raised. `manySessions` only. */
  sessionCount?: number;
  /** When a member of staff dismissed it. Absent while it is `open`. */
  dismissedAt?: number;
  /** Who dismissed it. Absent while it is `open`. */
  dismissedByUserId?: string;
}

/** Whether an unknown value is an anomaly kind this model knows. */
export const isScanAnomalyKind = (value: unknown): value is ScanAnomalyKind =>
  typeof value === 'string' &&
  (SCAN_ANOMALY_KINDS as readonly string[]).includes(value);

/** Whether an unknown value is an anomaly status this model knows. */
export const isScanAnomalyStatus = (
  value: unknown,
): value is ScanAnomalyStatus =>
  typeof value === 'string' &&
  (SCAN_ANOMALY_STATUSES as readonly string[]).includes(value);

/**
 * Whether this anomaly is still asking to be read.
 *
 * The predicate every reader filters by, because the collection keeps dismissed
 * documents at their derived names rather than deleting them - so "what is in
 * the collection" and "what the floor has not seen" are two different
 * questions, and only one of them is drawn.
 */
export const isOpenScanAnomaly = (
  anomaly: Pick<ScanAnomaly, 'status'>,
): boolean => anomaly.status === 'open';

/** What a member of staff sends to clear one. */
export interface DismissScanAnomalyRequest {
  restaurantId: string;
  /**
   * The table and the kind rather than the document id, because those are what
   * the id *is* - and naming the parts means a caller cannot address a document
   * in another restaurant by pasting a name.
   */
  tableId: string;
  kind: ScanAnomalyKind;
}

/**
 * What `dismissScanAnomaly` answers with.
 *
 * No `expectedStatus` and no conflict, for the reason
 * `AcknowledgeTableAssistanceResult` has none: dismissal has one destination,
 * so two people pressing it in the same second both got what they wanted. The
 * second press is answered with the stored values rather than with an error
 * about a race that cost nobody anything.
 */
export interface DismissScanAnomalyResult {
  restaurantId: string;
  tableId: string;
  kind: ScanAnomalyKind;
  status: ScanAnomalyStatus;
  dismissedAt: number;
  dismissedByUserId: string;
  /** False when somebody else had already dismissed it. */
  changed: boolean;
}
