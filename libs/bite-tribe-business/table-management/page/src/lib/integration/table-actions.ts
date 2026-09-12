import {
  allowedTableStatusTransitions,
  canTransitionTableStatus,
  TableStatus,
} from 'model';

/**
 * What a staff member may do to the table in front of them
 * (GitHub issue #1094).
 *
 * ## Derived from the matrix, never listed beside it
 *
 * The acceptance criterion is that a disallowed transition is not offered
 * rather than offered and then rejected, and the only way to keep that true is
 * to build the list from `TABLE_STATE_TRANSITIONS` itself. A hand-written list
 * of buttons per status would be a second copy of the state machine, and the
 * copy that drifts is always the one nobody tests against the backend - the
 * same reason issue #1092 compares its function-side copy row by row rather
 * than trusting the two to agree.
 *
 * So this file holds no rule about *which* transitions exist. It holds the two
 * things the matrix cannot: what each move is called in front of a host, and
 * the order the moves are worth offering in.
 *
 * ## Why `ordering` and `awaitingPayment` are here
 *
 * Issue #1094 names six actions and these two are not among them, because the
 * events that reach those statuses are the QR ordering of issue #1072. But
 * they are in the matrix now, deliberately (issue #1091), and the live view
 * already draws them, counts them and times them. A sheet that offered every
 * status but those two would leave a room with no way to reach a state the
 * plan is built to show - and the use case is explicit that a table awaiting
 * payment for twenty minutes is the thing staff walk to next. Offering them is
 * one line here rather than a feature; withholding them would have been the
 * decision needing a reason.
 */

/**
 * What a staff member asked for, as the sheet reports it.
 *
 * Declared here rather than on the sheet component so the service can take it
 * without importing the component that raises it - the component already
 * imports this module, and a service reaching back the other way would close
 * the loop.
 */
export interface TableActionRequest {
  to: TableStatus;
  /** The party size, when one was entered. Absent otherwise. */
  guests?: number;
}

/** One button in the action sheet. */
export interface TableAction {
  /** The status the table moves into. */
  to: TableStatus;
  /** Transloco key for the button's label. */
  labelKey: string;
  /**
   * Whether this action seats a party, and therefore carries the guest count.
   *
   * One flag rather than a check on `to` at each call site, so the sheet, the
   * service and the specs all agree on which button the count belongs to.
   */
  seating: boolean;
}

/**
 * The order the actions are offered in, most reached for first.
 *
 * Not the matrix's own order, which is written in lifecycle order because that
 * is how a state machine is read. A host is not reading a state machine: at a
 * free table the overwhelmingly common answer is "seat", at an occupied one it
 * is "free", and taking a table out of service is rare enough to belong last
 * wherever it appears. A row of buttons whose first entry is the one almost
 * always wanted is the difference between reading the sheet and hitting it.
 */
const ACTION_ORDER: readonly TableStatus[] = [
  'occupied',
  'available',
  'reserved',
  'cleaning',
  'awaitingPayment',
  'ordering',
  'disabled',
];

/**
 * What moving into `to` is called, given where the table is coming from.
 *
 * `available` is the one target that needs the source: freeing an occupied
 * table and putting a blocked one back into service are the same transition
 * and are not the same sentence. Every other status means one thing however it
 * was reached.
 */
const labelKeyFor = (from: TableStatus, to: TableStatus): string => {
  if (to === 'available') {
    return from === 'disabled' ? 'table-action-reenable' : 'table-action-free';
  }

  return {
    available: 'table-action-free',
    reserved: 'table-action-reserve',
    occupied: 'table-action-seat',
    ordering: 'table-action-ordering',
    awaitingPayment: 'table-action-awaiting-payment',
    cleaning: 'table-action-clean',
    disabled: 'table-action-disable',
  }[to];
};

/**
 * Everything a table in `from` can be asked to do, in the order to offer it.
 *
 * Never empty for any status the model knows, because every row of the matrix
 * has at least one target - which is what keeps the sheet from opening on a
 * table with nothing in it.
 */
export const tableActions = (from: TableStatus): TableAction[] => {
  const allowed = allowedTableStatusTransitions(from);

  return ACTION_ORDER.filter((to) => allowed.includes(to)).map((to) => ({
    to,
    labelKey: labelKeyFor(from, to),
    seating: to === 'occupied',
  }));
};

/**
 * Whether a table in `from` can be freed.
 *
 * The end-of-service reset asks this of every selected table, so tables it
 * cannot apply to are left alone rather than sent to the backend to be
 * refused. `ordering` is the interesting no: a party still choosing is not a
 * table anybody meant to include in a reset.
 */
export const canFreeTable = (from: TableStatus): boolean =>
  canTransitionTableStatus(from, 'available');

/**
 * How a party size is recorded, until there is a field for it.
 *
 * The guest count belongs to the visit, and the visit is issue #1095: a party
 * has a size, a start, orders and a bill, and `TableState` deliberately holds
 * none of them - it points at a visit instead. So there is nowhere durable to
 * put the number today, and the two wrong answers are inventing a field on the
 * state that #1095 would then have to migrate, and dropping the count the
 * issue asked for.
 *
 * The third answer is the audit entry's `reason`, which is free text whose
 * documented purpose is why a transition happened, and "a party of four sat
 * down" is why. Untranslated on purpose: the trail's neighbouring fields are
 * raw status ids read during a dispute rather than copy shown to a guest, and
 * a history written in whichever language the host's tablet happened to be in
 * is a history nobody can read end to end.
 *
 * Nothing parses it back. When #1095 lands, the number moves to
 * `TableVisit.guestCount` and becomes a field, which is what it should have
 * been - this is the note in the margin until then.
 */
export const guestCountReason = (guests: number): string =>
  `Party of ${guests}`;
