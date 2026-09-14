/**
 * What the restaurant is told about scans that do not look ordinary, as the
 * backend has to write it (GitHub issue #1107).
 *
 * ## Why this is a second copy
 *
 * The single definition is `scan-anomaly.ts` in `libs/bite-tribe-common/model`
 * and it carries the reasoning. This project cannot import it: it compiles with
 * its own `tsconfig.json`, whose `rootDir` is `src` and which carries none of
 * the workspace path mappings, and the deploy uploads `lib/` alone - the wall
 * `shared/roles.ts`, `table-state.ts`, `table-visit.ts`, `table-scan.ts`,
 * `table-session.ts`, `table-order.ts` and `table-assistance.ts` each hit,
 * answered the same way. `src/__specs__/scan-anomaly-parity.spec.ts` reads both
 * files as text and fails the build when the kinds, the statuses, the id
 * derivation, the quiet window, the session floor or the distance threshold
 * disagree.
 *
 * The drift this guards against is the kind list. A kind the backend raises and
 * the staff screen has no sentence for renders as a blank row in a list whose
 * whole purpose is telling somebody something - and both codebases would keep
 * passing their own tests while it happened. The id is the second: it is
 * derived on both sides, here to write one and in the business app to dismiss
 * one, so a separator changed in one file alone is a dismissal that lands on a
 * document nothing wrote.
 *
 * ## Storage
 *
 * ```text
 * /restaurants/{restaurantId}/scanAnomalies/{n}_{tableId}_{kind}
 * ```
 */

export const SCAN_ANOMALY_KINDS = [
  'rateLimited',
  'outsideOpeningHours',
  'disabledTable',
  'manySessions',
  'distantScan',
] as const;

export type ScanAnomalyKind = (typeof SCAN_ANOMALY_KINDS)[number];

export const SCAN_ANOMALY_STATUSES = ['open', 'dismissed'] as const;

export type ScanAnomalyStatus = (typeof SCAN_ANOMALY_STATUSES)[number];

/** The status every anomaly is raised in. */
export const INITIAL_SCAN_ANOMALY_STATUS: ScanAnomalyStatus = 'open';

/** One subcollection per restaurant, beside the signals and the live states. */
export const SCAN_ANOMALIES_COLLECTION = 'scanAnomalies';

/**
 * The document name for one kind of anomaly at one table.
 *
 * Derived rather than generated, which is what bounds the collection at the
 * number of kinds per table however hard the endpoint is worked. See the
 * library copy for the whole argument.
 */
export const scanAnomalyId = (tableId: string, kind: ScanAnomalyKind): string =>
  `${tableId.length}_${tableId}_${kind}`;

/**
 * How long after raising one anomaly the same table and kind writes again.
 *
 * The bound on what the writer costs. Without it a loop against a photographed
 * token turns every refusal into a Firestore write, which is a worse outcome
 * than the loop it reports.
 */
export const SCAN_ANOMALY_QUIET_MS = 60_000;

/** The fewest live sessions on a table that can ever be an anomaly. */
export const MIN_SESSIONS_BEFORE_ANOMALY = 6;

/** How many live sessions one table may hold before it is worth a row. */
export const manySessionsThreshold = (seats: number): number =>
  Math.max(
    Number.isFinite(seats) && seats > 0 ? seats : 0,
    MIN_SESSIONS_BEFORE_ANOMALY,
  );

/** A coarse position the guest chose to share when they scanned. */
export interface ScanPosition {
  latitude: number;
  longitude: number;
  /** The radius the device claims the fix is good to, in metres. */
  accuracyMeters: number;
}

/** How far a consented scan has to be from the restaurant to be worth a row. */
export const DISTANT_SCAN_METERS = 500;

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The great-circle distance between a scan and its restaurant, in metres. */
export const scanDistanceMeters = (
  scan: { latitude: number; longitude: number },
  restaurant: { latitude: number; longitude: number },
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
 * Both conditions. A device reporting a kilometre of uncertainty cannot support
 * a five-hundred-metre claim, so it makes none.
 */
export const isDistantScan = (
  distanceMeters: number,
  accuracyMeters: number,
): boolean =>
  distanceMeters > DISTANT_SCAN_METERS &&
  distanceMeters > (Number.isFinite(accuracyMeters) ? accuracyMeters : 0);

/** One table's unusual scan, as the restaurant reads it. */
export interface ScanAnomaly {
  id: string;
  restaurantId: string;
  tableId: string;
  tableLabel: string;
  kind: ScanAnomalyKind;
  status: ScanAnomalyStatus;
  firstSeenAt: number;
  lastSeenAt: number;
  /** Raisings, not requests. Bursts inside the quiet window are one. */
  count: number;
  /** Rounded metres. `distantScan` only, and all that survives of a position. */
  distanceMeters?: number;
  /** Live sessions on the table when it was raised. `manySessions` only. */
  sessionCount?: number;
  dismissedAt?: number;
  dismissedByUserId?: string;
}

/** Whether an unknown value is an anomaly kind this backend knows. */
export const isScanAnomalyKind = (value: unknown): value is ScanAnomalyKind =>
  typeof value === 'string' &&
  (SCAN_ANOMALY_KINDS as readonly string[]).includes(value);

/**
 * A coarse position out of whatever the client sent, or `undefined`.
 *
 * Every field has to be a finite number and the coordinates have to be on the
 * globe. Anything else is dropped silently rather than refused, which is the
 * one place in this flow where silence is right: the position is optional, so a
 * malformed one has to behave exactly like an absent one or the guest who sent
 * it is worse off than the guest who sent nothing.
 */
export const parseScanPosition = (value: unknown): ScanPosition | undefined => {
  const candidate = value as Partial<ScanPosition> | null | undefined;
  const latitude = candidate?.latitude;
  const longitude = candidate?.longitude;
  const accuracyMeters = candidate?.accuracyMeters;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return undefined;
  }

  return {
    latitude,
    longitude,
    accuracyMeters:
      typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters)
        ? accuracyMeters
        : 0,
  };
};
