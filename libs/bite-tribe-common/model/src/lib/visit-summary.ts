import type { Geopoint } from './geopoint';
import type { TableVisitBillLine } from './table-visit-bill';
import type {
  TableVisitPaymentStatus,
  TableVisitSettlementMethod,
} from './table-visit';

/**
 * What a guest keeps after the meal (GitHub issue #1111).
 *
 * ## It is a summary, and calling it anything else is a claim
 *
 * `ADR-0004` and `RD-TS-46`. BiteTribe never took the money, so this says what
 * was ordered and what it came to, and never that a payment was made to
 * anyone. It carries no tax line, no document number and no sequence, because
 * a document that claims to evidence payment carries fiscalisation duties in
 * several markets even where the money moved elsewhere. The restaurant's own
 * till issues whatever the law requires.
 *
 * ## One document per guest, not one per visit
 *
 * Written under the **guest's own uid** at
 * `/users/{uid}/visitSummaries/{visitId}`, one for each session that was ever
 * active on the visit.
 *
 * A single document under the restaurant would have been fewer writes and the
 * wrong shape. "Reachable later from their account, permanently" is a question
 * about a person rather than about a table, and a per-guest document answers
 * it with the name: the guest lists their own, and nothing has to prove which
 * party they were in six months ago. It also survives registration for free -
 * issue [#1657] links the anonymous account in place rather than minting a new
 * one, so the uid the summary is filed under is the uid the guest signs in
 * with afterwards.
 *
 * What it costs is a copy per guest. That is the point: the party splits up
 * and each of them keeps what they ate.
 *
 * ## The lines are the bill's own rows
 *
 * {@link TableVisitBillLine}, unchanged from issue [#1110]. The summary is the
 * bill frozen at the moment the visit closed, so a second row shape would be a
 * second answer to "what did this table order" - free to disagree with the one
 * the guest was shown while they were still sitting there. It carries no
 * `guestUserId` on any line, for the reason `RD-TS-47` gives: the rows are
 * merged across the whole party, and who ordered what is not recorded.
 */

/** One subcollection per account, holding the meals it has finished. */
export const VISIT_SUMMARIES_COLLECTION = 'visitSummaries';

/** A meal that is over, as the guest who ate it keeps it. */
export interface VisitSummary {
  /** Equal to the document id, which is the visit's id. */
  id: string;
  restaurantId: string;
  /**
   * The restaurant's name as it stood when the visit closed.
   *
   * Copied rather than looked up, like every other field here. A restaurant
   * that renames itself has not changed where the guest ate in March.
   */
  restaurantName: string;
  /** The table the party was sitting at when the visit ended. */
  tableLabel: string;
  /**
   * Where the restaurant is, copied at close (GitHub issue #1112).
   *
   * Here so that a Bite made from this meal is complete. `Bite.position` is
   * `Validators.required` on the creation form, and a guest reading a summary
   * at home is nowhere near the restaurant - so their own GPS would file the
   * dish at their kitchen table. The trigger that writes this already has the
   * restaurant document open for the name, so it costs nothing.
   *
   * Absent on a summary written before issue #1112, and on a restaurant with
   * no position recorded. A Bite made from one of those asks for a position
   * the way any other Bite does.
   */
  restaurantPosition?: Geopoint;
  /** When staff ended the visit, in epoch milliseconds. */
  closedAt: number;
  /** ISO 4217, read off the orders and equal on every line. */
  currency: string;
  /** Every dish the table ordered, merged, cancelled orders excluded. */
  lines: readonly TableVisitBillLine[];
  /** The sum of every line total. */
  total: number;
  /** Whether the restaurant recorded a payment before the visit closed. */
  paymentStatus: TableVisitPaymentStatus;
  /** How the party paid, where staff recorded it. */
  settlementMethod?: TableVisitSettlementMethod;
  /**
   * When this guest had the summary emailed, if they did.
   *
   * The presence of the field is what stops a second send (`RD-TS-48`), and it
   * is deliberately a timestamp rather than a boolean: "when" answers a
   * support question that "whether" does not. **The address is not here.** It
   * is used for the one send and stored nowhere.
   */
  emailedAt?: number;
  /**
   * Whether a Bite has been made from this meal (GitHub issue #1112).
   *
   * Written `false` at close and flipped by the trigger that watches Bites, so
   * the nightly reminder can ask for it in a `where`. A **field** rather than
   * the absence of one, because Firestore cannot query for a missing field in
   * a collection group, and the reminder reads every guest's summaries at once.
   */
  biteCreated?: boolean;
  /**
   * Whether the one reminder has gone out (GitHub issue #1112).
   *
   * The guest is offered a Bite at the table and once the next morning, and
   * then never again (`RD-TS-51`). This is what makes "never again" true of
   * the record rather than of a habit, and it is queried for the same reason
   * {@link biteCreated} is.
   */
  reminded?: boolean;
}

/**
 * Why a summary could not be read.
 *
 * Two, and the second is the whole retention rule. A member reads their own
 * summaries for as long as the account exists; a guest who never registered
 * reads theirs until the session that produced them goes idle, which is
 * `sessionIdleTimeoutMinutes` and two hours by default (`RD-TS-46`, resting on
 * `RD-TS-5`). No second clock and no expiry field: the session already has
 * one, and the summary is read through a callable precisely so that predicate
 * can be applied - `firestore.rules` cannot compute it against a per-restaurant
 * setting.
 */
export const VISIT_SUMMARY_REFUSAL_REASONS = [
  /** No summary of that visit is filed under this account. */
  'notFound',
  /** An unregistered guest whose session has ended or gone idle. */
  'sessionExpired',
] as const;

/** Why a summary could not be read. */
export type VisitSummaryRefusalReason =
  (typeof VISIT_SUMMARY_REFUSAL_REASONS)[number];

/** The summary could not be read, and this is why. */
export interface VisitSummaryRefused {
  readonly ok: false;
  readonly reason: VisitSummaryRefusalReason;
}

/** One summary, read back. */
export interface VisitSummaryRead {
  readonly ok: true;
  readonly summary: VisitSummary;
}

/** Every summary this account keeps, newest meal first. */
export interface VisitSummaryList {
  readonly ok: true;
  readonly summaries: readonly VisitSummary[];
}

/** What `readVisitSummary` answers with. */
export type ReadVisitSummaryResult = VisitSummaryRead | VisitSummaryRefused;

/** What `listVisitSummaries` answers with. */
export type ListVisitSummariesResult = VisitSummaryList | VisitSummaryRefused;

/**
 * Why a summary could not be emailed.
 *
 * `alreadySent` is a refusal rather than a silent success, because a guest who
 * mistyped an address and taps again is owed the truth: the mail went to the
 * address they gave the first time, and this screen cannot recall it.
 */
export const VISIT_SUMMARY_EMAIL_REFUSAL_REASONS = [
  'notFound',
  'sessionExpired',
  /** This guest has already had this visit emailed once. */
  'alreadySent',
  /** The address is not one this backend will send to. */
  'invalidAddress',
  /** The mail transport refused or failed. */
  'sendFailed',
] as const;

/** Why a summary could not be emailed. */
export type VisitSummaryEmailRefusalReason =
  (typeof VISIT_SUMMARY_EMAIL_REFUSAL_REASONS)[number];

/** The mail could not be sent, and this is why. */
export interface VisitSummaryEmailRefused {
  readonly ok: false;
  readonly reason: VisitSummaryEmailRefusalReason;
}

/** The mail was sent. */
export interface VisitSummaryEmailSent {
  readonly ok: true;
  /** When it went out, which is also what refuses the second attempt. */
  readonly emailedAt: number;
}

/** What `emailVisitSummary` answers with. */
export type EmailVisitSummaryResult =
  VisitSummaryEmailSent | VisitSummaryEmailRefused;

/** Whether a summary has already been emailed to this guest. */
export const isVisitSummaryEmailed = (
  summary: Pick<VisitSummary, 'emailedAt'>,
): boolean => typeof summary.emailedAt === 'number';
