import { isTableOrderRequestId } from 'model';
import type { SubmitTableOrderLine } from 'model';

/**
 * An order the guest sent and the phone could not confirm arrived
 * (GitHub issue #1108).
 *
 * ## Why it is written down rather than simply retried
 *
 * The same argument the staff transition queue of issue #1096 makes, in a room
 * with worse wifi and a guest who cannot ask a colleague what happened. A
 * submission whose answer was lost is, from the phone, indistinguishable from
 * one that never arrived - and the gap can outlast the page: a phone gets
 * locked, a tab gets dropped, a guest walks to the bathroom and comes back to a
 * reloaded screen. So the ask is a durable record, not a promise waiting to
 * settle.
 *
 * ## The key is the whole point
 *
 * {@link PendingTableOrder.requestId} is minted once, when the guest taps send,
 * and reused by every attempt afterwards - including attempts made in a later
 * session of the app. The backend names the order document after it, so the
 * second attempt is answered with the order the first one wrote instead of
 * writing a second one. Two taps on a spinner are one schnitzel.
 *
 * ## Why the lines are stored and not just the cart
 *
 * Because they are not the same thing. The cart is what the guest is building
 * and may go on editing; these are the lines they *sent*, at the prices they
 * agreed to, and a retry has to send exactly those. Re-deriving them from the
 * cart would let a row added while the order was in flight arrive as part of an
 * order the guest never saw.
 */
export interface PendingTableOrder {
  /** The idempotency key, minted once per intent and reused by every attempt. */
  requestId: string;
  restaurantId: string;
  /** The table the guest scanned, as the submission addressed it. */
  tableId: string;
  /** The currency the phone displayed, checked by the backend like the prices. */
  currency: string;
  /** Exactly what was sent, including the prices the guest agreed to. */
  lines: SubmitTableOrderLine[];
  /** When the guest tapped send, on the device's clock. */
  sentAt: number;
}

/**
 * What the phone knows about whether the restaurant got it.
 *
 * Two answers rather than one, because they call for two different sentences
 * and the issue asks for exactly this: "a guest is never left unsure whether
 * their order was placed". Telling somebody an order *might* have arrived when
 * the phone never had a signal would be inventing a doubt; telling them it
 * definitely did not when an attempt timed out mid-flight would be inventing a
 * certainty, and the dish would turn up anyway.
 */
export type TableOrderDelivery =
  /** No attempt ever left the device. The restaurant does not have it. */
  | 'notSent'
  /** An attempt went out and the answer was lost. It may or may not be there. */
  | 'unknown';

/**
 * How long a written-down submission is still worth sending on its own.
 *
 * A record found within the window is a guest who is still at the table and
 * still waiting, so resolving it without being asked is what they want. Beyond
 * it, the restaurant's own session idle timeout has almost certainly closed the
 * table anyway, and sending an order into a dining room somebody left hours ago
 * is worse than dropping a record nobody is watching for.
 */
export const PENDING_ORDER_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** One line, as it was read back off the device. Checked, never trusted. */
const isSubmitLine = (value: unknown): value is SubmitTableOrderLine => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const line = value as Partial<Record<keyof SubmitTableOrderLine, unknown>>;

  return (
    typeof line.menuItemId === 'string' &&
    line.menuItemId.length > 0 &&
    typeof line.quantity === 'number' &&
    typeof line.price === 'number'
  );
};

/**
 * Whether something read back out of device storage is a submission.
 *
 * The record outlives the app version that wrote it, so what comes back is
 * untyped until it has been checked. A half-written or stale entry is dropped
 * rather than sent: a request the backend would refuse as malformed is one more
 * sentence in front of somebody who is hungry, and a record that cannot be
 * parsed must not take the ordering screen down with it.
 *
 * The key is checked against the model's own pattern rather than for mere
 * presence, because it is the one field that has to be legal on the other side:
 * a key the backend refuses as an argument would turn a recoverable submission
 * into an error the guest can do nothing with.
 */
export const isPendingTableOrder = (
  value: unknown,
): value is PendingTableOrder => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const pending = value as Partial<Record<keyof PendingTableOrder, unknown>>;

  return (
    isTableOrderRequestId(pending.requestId) &&
    typeof pending.restaurantId === 'string' &&
    pending.restaurantId.length > 0 &&
    typeof pending.tableId === 'string' &&
    pending.tableId.length > 0 &&
    typeof pending.currency === 'string' &&
    typeof pending.sentAt === 'number' &&
    Array.isArray(pending.lines) &&
    pending.lines.length > 0 &&
    pending.lines.every(isSubmitLine)
  );
};

/** The record, or nothing where what came back was not one. */
export const parsePendingTableOrder = (
  value: unknown,
): PendingTableOrder | undefined =>
  isPendingTableOrder(value) ? value : undefined;

/** Whether a written-down submission is still worth sending unprompted. */
export const isResumable = (pending: PendingTableOrder, now: number): boolean =>
  now - pending.sentAt < PENDING_ORDER_MAX_AGE_MS;
