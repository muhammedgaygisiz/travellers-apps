import type { TableVisitBillLine } from './table-visit-bill';
import type {
  TableVisitPaymentStatus,
  TableVisitSettlementMethod,
} from './table-visit';

/**
 * What a guest keeps after the meal, as the backend writes it
 * (GitHub issue #1111).
 *
 * ## Why this is a second copy
 *
 * The wall `table-visit.ts` next door describes: this project compiles with
 * its own `tsconfig.json`, whose `rootDir` is `src`, and the deploy uploads
 * `lib/` alone. The single definition is `visit-summary.ts` in
 * `libs/bite-tribe-common/model`, and
 * `src/__specs__/visit-summary-parity.spec.ts` compares the collection name
 * and both refusal lists as text.
 *
 * ## It is a summary, and calling it anything else is a claim
 *
 * `ADR-0004`, `RD-TS-46`. No tax line, no document number, no sequence.
 * BiteTribe never took the money, and a document that claims to evidence a
 * payment carries fiscalisation duties in several markets even where the money
 * moved elsewhere.
 *
 * ## Storage
 *
 * ```text
 * /users/{uid}/visitSummaries/{visitId}
 * ```
 *
 * Under the **guest** rather than under the restaurant, one per session that
 * was ever active on the visit. "Reachable later from their account" is a
 * question about a person, and a per-guest document answers it with the name -
 * nothing has to prove which party somebody was in six months ago. Issue
 * #1657 links an anonymous account in place rather than minting a new one, so
 * the uid a summary is filed under is the uid the guest signs in with
 * afterwards, and the meal follows them into the account for free.
 */

/** One subcollection per account, holding the meals it has finished. */
export const VISIT_SUMMARIES_COLLECTION = 'visitSummaries';

/** The collection the guest documents live in. */
export const USERS_COLLECTION = 'users';

/** A meal that is over, as the guest who ate it keeps it. */
export interface VisitSummary {
  id: string;
  restaurantId: string;
  restaurantName: string;
  tableLabel: string;
  /** Where the restaurant is, so a Bite made from this meal is complete. */
  restaurantPosition?: { latitude: number; longitude: number };
  closedAt: number;
  currency: string;
  lines: readonly TableVisitBillLine[];
  total: number;
  paymentStatus: TableVisitPaymentStatus;
  settlementMethod?: TableVisitSettlementMethod;
  /** When this guest had it emailed. Its presence refuses a second send. */
  emailedAt?: number;
  /** Whether a Bite has been made from this meal (GitHub issue #1112). */
  biteCreated?: boolean;
  /** Whether the one nightly reminder has gone out. */
  reminded?: boolean;
}

/**
 * Why a summary could not be read.
 *
 * Two, and the second is the retention rule: a member keeps theirs for as long
 * as the account exists, and a guest who never registered keeps theirs until
 * the session that produced them goes idle (`RD-TS-46`, resting on `RD-TS-5`).
 * That predicate is why the read is a callable - `firestore.rules` cannot
 * compute an idle timeout against a per-restaurant setting.
 */
export const VISIT_SUMMARY_REFUSAL_REASONS = [
  'notFound',
  'sessionExpired',
] as const;

export type VisitSummaryRefusalReason =
  (typeof VISIT_SUMMARY_REFUSAL_REASONS)[number];

export interface VisitSummaryRefused {
  readonly ok: false;
  readonly reason: VisitSummaryRefusalReason;
}

/** One refusal, spelled once. */
export const refuseSummary = (
  reason: VisitSummaryRefusalReason,
): VisitSummaryRefused => ({ ok: false, reason });

/**
 * Why a summary could not be emailed.
 *
 * `alreadySent` is a refusal rather than a silent success: a guest who
 * mistyped an address and taps again is owed the truth, because the mail went
 * to the address they gave first and nothing here can recall it.
 */
export const VISIT_SUMMARY_EMAIL_REFUSAL_REASONS = [
  'notFound',
  'sessionExpired',
  'alreadySent',
  'invalidAddress',
  'sendFailed',
] as const;

export type VisitSummaryEmailRefusalReason =
  (typeof VISIT_SUMMARY_EMAIL_REFUSAL_REASONS)[number];

export interface VisitSummaryEmailRefused {
  readonly ok: false;
  readonly reason: VisitSummaryEmailRefusalReason;
}

export interface VisitSummaryEmailSent {
  readonly ok: true;
  readonly emailedAt: number;
}

export type EmailVisitSummaryResult =
  VisitSummaryEmailSent | VisitSummaryEmailRefused;

/** One refusal, spelled once. */
export const refuseEmail = (
  reason: VisitSummaryEmailRefusalReason,
): VisitSummaryEmailRefused => ({ ok: false, reason });

/**
 * Whether a string is an address this backend will hand to the mail transport.
 *
 * Deliberately shallow. The only address that matters is one a guest typed on
 * a phone thirty seconds ago, and the authoritative test of whether it is
 * theirs is whether the mail arrives - a stricter grammar would reject valid
 * addresses (plus tags, long TLDs, unicode domains) in exchange for catching
 * typos it cannot distinguish from choices. What this refuses is the shapes
 * that are not an address at all, including the header separators that would
 * let one field become two.
 */
export const isSendableAddress = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const address = value.trim();

  return (
    address.length > 2 &&
    address.length <= 254 &&
    /^[^\s@,;:<>"]+@[^\s@,;:<>"]+\.[^\s@,;:<>"]{2,}$/.test(address) &&
    !/[\r\n]/.test(address)
  );
};
