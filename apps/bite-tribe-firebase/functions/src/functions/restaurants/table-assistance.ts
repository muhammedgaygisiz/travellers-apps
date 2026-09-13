import { DocumentData } from 'firebase-admin/firestore';
import { TableStatus } from './table-state';

/**
 * A guest asking for a waiter, as the backend has to know it
 * (GitHub issue #1106).
 *
 * ## Why this is a second copy
 *
 * The single definition is `table-assistance.ts` in
 * `libs/bite-tribe-common/model` and it carries the reasoning. This project
 * cannot import it: it compiles with its own `tsconfig.json`, whose `rootDir`
 * is `src` and which carries none of the workspace path mappings, and the
 * deploy uploads `lib/` alone - the wall `shared/roles.ts`, `table-state.ts`,
 * `table-visit.ts`, `table-scan.ts`, `table-session.ts` and `table-order.ts`
 * each hit, answered the same way.
 * `src/__specs__/table-assistance-parity.spec.ts` reads both files as text and
 * fails the build when the kinds, the statuses, the refusal reasons, the
 * cooldown, the collection name or the id derivation disagree.
 *
 * Two of those drift silently and badly. **The id** is computed on both sides -
 * the guest's phone derives the name to subscribe to the answer, and this side
 * derives it to write one - so a separator changed here and not there leaves a
 * guest watching a document nothing ever writes, with both codebases passing
 * their own tests. And **the cooldown** is the number the screen counts down
 * from; a phone that believed it was thirty seconds would offer a button the
 * backend refuses.
 *
 * ## Storage
 *
 * ```text
 * /restaurants/{restaurantId}/assistanceRequests/{n}_{tableId}_{kind}
 * ```
 */

/** What the guest is asking for. */
export const TABLE_ASSISTANCE_KINDS = [
  /** Somebody is wanted at the table. */
  'callStaff',
  /** The party would like to pay. The one kind that moves the table. */
  'requestBill',
] as const;

export type TableAssistanceKind = (typeof TABLE_ASSISTANCE_KINDS)[number];

/** Every status a signal can hold. */
export const TABLE_ASSISTANCE_STATUSES = [
  /** Raised, and nobody has said they have seen it. */
  'open',
  /** A member of staff took it. The marker goes, on every device. */
  'acknowledged',
] as const;

export type TableAssistanceStatus = (typeof TABLE_ASSISTANCE_STATUSES)[number];

/** The status every signal starts in. */
export const INITIAL_TABLE_ASSISTANCE_STATUS: TableAssistanceStatus = 'open';

/** One subcollection per restaurant, beside the live table states. */
export const TABLE_ASSISTANCE_REQUESTS_COLLECTION = 'assistanceRequests';

/**
 * The document name for one kind of signal at one table.
 *
 * Derived rather than generated, which is what makes a repeated tap address
 * the signal that is already up instead of raising a second one. The leading
 * length makes the derivation injective; see the library copy.
 */
export const tableAssistanceRequestId = (
  tableId: string,
  kind: TableAssistanceKind,
): string => `${tableId.length}_${tableId}_${kind}`;

/** How long after raising one signal the same table may raise it again. */
export const TABLE_ASSISTANCE_COOLDOWN_MS = 60_000;

/** How many accounts one signal records as having asked for it. */
export const MAX_TABLE_ASSISTANCE_REQUESTERS = 20;

/**
 * The table statuses a signal may be raised from.
 *
 * The three that mean a party is sitting there. `awaitingPayment` is in the
 * list, unlike in `ORDERABLE_TABLE_STATUSES`: a party that has asked for the
 * bill has stopped ordering and has not stopped needing a waiter.
 */
export const ATTENDED_TABLE_STATUSES: readonly TableStatus[] = [
  'occupied',
  'ordering',
  'awaitingPayment',
];

/** The status a table holds once the bill has been asked for. */
export const TABLE_STATUS_AFTER_BILL_REQUEST: TableStatus = 'awaitingPayment';

/** One signal, as the restaurant sees it. */
export interface TableAssistanceRequest {
  id: string;
  restaurantId: string;
  tableId: string;
  /** The visit the party was on when they raised it, where there was one. */
  visitId?: string;
  kind: TableAssistanceKind;
  status: TableAssistanceStatus;
  requestedAt: number;
  /** The most recent tap that landed on this signal. Never resets the age. */
  lastRequestedAt: number;
  /** Everyone who asked, and the list `firestore.rules` admits as readers. */
  requestedByUserIds: string[];
  acknowledgedAt?: number;
  acknowledgedByUserId?: string;
}

/** Whether an unknown value is a kind this backend knows. */
export const isTableAssistanceKind = (
  value: unknown,
): value is TableAssistanceKind =>
  typeof value === 'string' &&
  (TABLE_ASSISTANCE_KINDS as readonly string[]).includes(value);

/** Whether an unknown value is a signal status this backend knows. */
export const isTableAssistanceStatus = (
  value: unknown,
): value is TableAssistanceStatus =>
  typeof value === 'string' &&
  (TABLE_ASSISTANCE_STATUSES as readonly string[]).includes(value);

/**
 * Whether a stored signal is still asking for somebody.
 *
 * Takes the raw document, because every caller here has just read one out of a
 * transaction. A document with no recognisable status is not open: it cannot
 * be acknowledged, and treating one written by a later version as open would
 * leave a marker on a room view that nothing can clear.
 */
export const isOpenAssistanceRequest = (
  request: DocumentData | undefined,
): boolean => request?.['status'] === 'open';

/** Why a signal was not raised. */
export const TABLE_ASSISTANCE_REFUSAL_REASONS = [
  'sessionNotFound',
  'sessionNotActive',
  'sessionExpired',
  'visitClosed',
  'tableNotAttended',
  'cooldown',
] as const;

export type TableAssistanceRefusalReason =
  (typeof TABLE_ASSISTANCE_REFUSAL_REASONS)[number];

export interface TableAssistanceRefused {
  ok: false;
  reason: TableAssistanceRefusalReason;
  /** When the guest may ask again, in epoch milliseconds. On `cooldown` only. */
  retryAt?: number;
}

/**
 * A refusal, assembled in one place.
 *
 * A function rather than an object literal at each return site, following
 * `refuseOrder` and `refuseScan`: the optional field is dropped rather than
 * written as `undefined`, which is what a callable's JSON would otherwise
 * carry to a client that checks `'retryAt' in result`.
 */
export const refuseAssistance = (
  reason: TableAssistanceRefusalReason,
  retryAt?: number,
): TableAssistanceRefused => ({
  ok: false,
  reason,
  ...(retryAt === undefined ? {} : { retryAt }),
});
