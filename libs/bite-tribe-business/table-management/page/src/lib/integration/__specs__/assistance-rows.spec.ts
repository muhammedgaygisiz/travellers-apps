import type { RestaurantTable, TableAssistanceRequest } from 'model';
import {
  ASSISTANCE_KIND_KEYS,
  ASSISTANCE_URGENT_AFTER_MS,
  assistanceRows,
  openAssistanceKindsByTable,
} from '../assistance-rows';

/**
 * The tables that are calling, as rows a floor reads (GitHub issue #1106).
 *
 * Pure functions, so what is asserted is the product rule rather than a
 * rendering: the order the room is answered in, what a repeated tap does to it,
 * and what survives a table being deleted from the floor plan.
 */

const NOW = Date.parse('2026-09-16T19:30:00.000Z');
const MINUTE = 60_000;

const table = (id: string, label: string): RestaurantTable =>
  ({
    id,
    label,
    roomId: 'room-1',
    position: { x: 0, y: 0 },
    rotation: 0,
    seats: 4,
    enabled: true,
    shape: 'round',
    diameter: 900,
  }) as unknown as RestaurantTable;

const calling = (
  overrides: Partial<TableAssistanceRequest> = {},
): TableAssistanceRequest => ({
  id: '8_table-12_callStaff',
  restaurantId: 'restaurant-1',
  tableId: 'table-12',
  visitId: 'visit-1',
  kind: 'callStaff',
  status: 'open',
  requestedAt: NOW - MINUTE,
  lastRequestedAt: NOW - MINUTE,
  requestedByUserIds: ['guest-1'],
  ...overrides,
});

const TABLES = [table('table-12', '12'), table('t5', '5')];

describe('assistanceRows', () => {
  it('names the table, what it wants and how long it has waited', () => {
    const [row] = assistanceRows([calling()], TABLES, NOW);

    expect(row).toMatchObject({
      id: 'table-12:callStaff',
      tableId: 'table-12',
      label: '12',
      kind: 'callStaff',
      kindKey: ASSISTANCE_KIND_KEYS.callStaff,
      urgent: false,
      askedAgain: false,
    });
    expect(row.waiting.params.minutes).toBe(1);
  });

  /**
   * The opposite order to the ticket queue, and the difference between a
   * kitchen and a dining room: a ticket that just landed is the one nobody has
   * read, and the guest who has been waving longest is the one nobody has
   * walked to.
   */
  it('puts the table that has waited longest first', () => {
    const rows = assistanceRows(
      [
        calling({ tableId: 't5', requestedAt: NOW - MINUTE }),
        calling({ tableId: 'table-12', requestedAt: NOW - 8 * MINUTE }),
      ],
      TABLES,
      NOW,
    );

    expect(rows.map((row) => row.tableId)).toEqual(['table-12', 't5']);
  });

  /**
   * Acknowledged signals stay in the collection at their derived names, so a
   * list that did not drop them would keep sending staff to tables somebody
   * has already walked to.
   */
  it('leaves out the ones somebody has already answered', () => {
    expect(
      assistanceRows([calling({ status: 'acknowledged' })], TABLES, NOW),
    ).toEqual([]);
  });

  it('gives a table calling for both a row each', () => {
    const rows = assistanceRows(
      [calling(), calling({ kind: 'requestBill' })],
      TABLES,
      NOW,
    );

    expect(rows.map((row) => row.id)).toEqual([
      'table-12:callStaff',
      'table-12:requestBill',
    ]);
  });

  /**
   * Three minutes, and deliberately far shorter than an order's twelve: an
   * order is waiting on a kitchen that is cooking it, and a raised hand is
   * waiting on nobody at all.
   */
  it('marks a table that has been calling too long', () => {
    const [row] = assistanceRows(
      [calling({ requestedAt: NOW - ASSISTANCE_URGENT_AFTER_MS })],
      TABLES,
      NOW,
    );

    expect(row.urgent).toBe(true);
  });

  /**
   * A repeated tap moves `lastRequestedAt` and leaves `requestedAt` alone, so
   * tapping cannot push a table up a list sorted by who has waited longest -
   * and the row still says that they asked twice, because a guest who did is a
   * guest who thinks nobody heard them.
   */
  it('says a guest asked again without shortening how long they have waited', () => {
    const [row] = assistanceRows(
      [
        calling({
          requestedAt: NOW - 8 * MINUTE,
          lastRequestedAt: NOW - MINUTE,
        }),
      ],
      TABLES,
      NOW,
    );

    expect(row.askedAgain).toBe(true);
    expect(row.waiting.params.minutes).toBe(8);
  });

  /**
   * Dropping the row would lose somebody who is waiting in order to tidy up a
   * number. The screen names it as an unknown table instead, as the order queue
   * does.
   */
  it('keeps a row for a table that has been deleted from the plan', () => {
    const [row] = assistanceRows([calling({ tableId: 'gone' })], TABLES, NOW);

    expect(row.label).toBe('');
  });
});

describe('openAssistanceKindsByTable', () => {
  it('collects what each table is calling for', () => {
    const byTable = openAssistanceKindsByTable([
      calling(),
      calling({ kind: 'requestBill' }),
      calling({ tableId: 't5', kind: 'requestBill' }),
    ]);

    expect(byTable.get('table-12')).toEqual(['callStaff', 'requestBill']);
    expect(byTable.get('t5')).toEqual(['requestBill']);
  });

  it('drops the ones somebody has answered', () => {
    expect(
      openAssistanceKindsByTable([calling({ status: 'acknowledged' })]).size,
    ).toBe(0);
  });

  /** Absent rather than an empty list, so the canvas has one "no marker". */
  it('leaves a table nobody is calling from out of the map', () => {
    expect(openAssistanceKindsByTable([]).has('table-12')).toBe(false);
  });
});
