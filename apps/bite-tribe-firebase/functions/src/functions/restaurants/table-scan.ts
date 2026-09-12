/**
 * What a scanned table QR code resolves to, as the backend has to say it
 * (GitHub issue #1100).
 *
 * ## Why this is a second copy
 *
 * The single definition is `table-ordering.ts` in
 * `libs/bite-tribe-common/model`. This project cannot import it: it compiles
 * with its own `tsconfig.json`, whose `rootDir` is `src` and which carries none
 * of the workspace path mappings, and the deploy uploads `lib/` alone - the
 * same wall `shared/roles.ts` and `restaurants/table-state.ts` hit, answered
 * the same way. `src/__specs__/table-scan-parity.spec.ts` reads both files as
 * text and fails the build when the reasons or the next steps disagree.
 *
 * The drift this guards against is silent in the worst possible place. A reason
 * the backend returns and the client has no sentence for renders as an empty
 * refusal screen, which is a guest standing at a table being told nothing at
 * all - precisely the outcome the issue's "distinct, actionable reason" is
 * about. Both copies would keep passing their own tests while that happened.
 *
 * Keep the two in step by changing both. The library file is the source of the
 * decision and carries the reasoning; this one carries the same data and the
 * shapes only the backend writes.
 */

export const TABLE_SCAN_REFUSAL_REASONS = [
  'unknownToken',
  'restaurantNotFound',
  'restaurantInactive',
  'tableOrderingDisabled',
  'tableNotFound',
  'tableDisabled',
  'tokenSuperseded',
  'tokenRevoked',
  'orderingPaused',
  'restaurantClosed',
  'menuMissing',
  'menuUnavailable',
] as const;

export type TableScanRefusalReason =
  (typeof TABLE_SCAN_REFUSAL_REASONS)[number];

export type TableScanNextStep = 'askStaff' | 'tryLater' | 'rescanCode';

/** The next step each reason calls for. */
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

export interface TableScanReopensAt {
  day: string;
  time: string;
}

export interface TableScanContext {
  token: string;
  restaurant: { id: string; name: string; image?: string };
  room: { id: string; name?: string };
  table: { id: string; label: string; seats: number };
  menu: { id: string };
}

export interface TableScanResolved extends TableScanContext {
  ok: true;
}

export interface TableScanRefused {
  ok: false;
  reason: TableScanRefusalReason;
  nextStep: TableScanNextStep;
  pausedUntilTimestamp?: number;
  reopensAt?: TableScanReopensAt;
}

export type TableScanResult = TableScanResolved | TableScanRefused;

/**
 * A refusal, with its next step filled in from the one table above.
 *
 * A function rather than an object literal at each of the twelve return sites,
 * so no branch can answer with a reason and the wrong next step - which is the
 * mistake a reviewer would have to check twelve times to catch.
 */
export const refuseScan = (
  reason: TableScanRefusalReason,
  extra: Omit<TableScanRefused, 'ok' | 'reason' | 'nextStep'> = {},
): TableScanRefused => ({
  ok: false,
  reason,
  nextStep: TABLE_SCAN_NEXT_STEPS[reason],
  ...extra,
});
