import {
  allowedTableStatusTransitions,
  TABLE_STATUSES,
  TableStatus,
} from 'model';
import { canFreeTable, guestCountReason, tableActions } from '../table-actions';

/**
 * The buttons a staff member is offered (GitHub issue #1094).
 *
 * The point of every assertion here is that the list is *derived*. Nothing
 * below hard-codes which transitions exist, because a spec that did would
 * agree with a hand-written button list right up until the matrix changed
 * under both of them.
 */
describe('tableActions', () => {
  /**
   * The acceptance criterion: a disallowed transition is not offered, rather
   * than offered and then rejected by the backend.
   */
  it.each(TABLE_STATUSES)('offers exactly what %s allows', (from) => {
    const offered = tableActions(from).map((action) => action.to);

    expect([...offered].sort()).toEqual(
      [...allowedTableStatusTransitions(from)].sort(),
    );
  });

  /** A status never lists itself, so no button re-applies what is already true. */
  it.each(TABLE_STATUSES)('never offers %s the status it holds', (from) => {
    expect(tableActions(from).map((action) => action.to)).not.toContain(from);
  });

  /** Every row of the matrix has a target, so the sheet is never empty. */
  it.each(TABLE_STATUSES)('always has something to offer %s', (from) => {
    expect(tableActions(from).length).toBeGreaterThan(0);
  });

  /**
   * Seating is the overwhelmingly common answer at a free table, and a sheet
   * whose first row is the one almost always wanted is a sheet nobody has to
   * read.
   */
  it('puts seating first wherever a party can be seated', () => {
    expect(tableActions('available')[0]).toEqual({
      to: 'occupied',
      labelKey: 'table-action-seat',
      seating: true,
    });
  });

  /**
   * Freeing an occupied table and putting a blocked one back into service are
   * the same transition and are not the same sentence.
   */
  it('names the move to available after where it came from', () => {
    const labelFor = (from: TableStatus): string | undefined =>
      tableActions(from).find((action) => action.to === 'available')?.labelKey;

    expect(labelFor('occupied')).toBe('table-action-free');
    expect(labelFor('disabled')).toBe('table-action-reenable');
  });

  /** The count belongs to seating and to nothing else. */
  it('marks only the seating action as carrying the guest count', () => {
    TABLE_STATUSES.forEach((from) =>
      tableActions(from).forEach((action) =>
        expect(action.seating).toBe(action.to === 'occupied'),
      ),
    );
  });

  /** Two statuses cannot share a button, or one of them is unreachable. */
  it.each(TABLE_STATUSES)('offers %s no move twice', (from) => {
    const offered = tableActions(from).map((action) => action.to);

    expect(new Set(offered).size).toBe(offered.length);
  });
});

describe('canFreeTable', () => {
  /**
   * What the end-of-service reset asks of every selected table. A party still
   * choosing is not a table anybody meant to include in a reset, and a table
   * already free has nothing to reset.
   */
  it('answers for every status the way the matrix does', () => {
    expect(TABLE_STATUSES.filter(canFreeTable)).toEqual([
      'reserved',
      'occupied',
      'awaitingPayment',
      'cleaning',
      'disabled',
    ]);
  });
});

describe('guestCountReason', () => {
  /**
   * Untranslated on purpose: the audit trail's neighbouring fields are raw
   * status ids read during a dispute, and a history written in whichever
   * language a tablet happened to be in is a history nobody can read end to
   * end. It moves to `TableVisit.guestCount` with issue #1095.
   */
  it('says the party size in one stable sentence', () => {
    expect(guestCountReason(4)).toBe('Party of 4');
  });
});
