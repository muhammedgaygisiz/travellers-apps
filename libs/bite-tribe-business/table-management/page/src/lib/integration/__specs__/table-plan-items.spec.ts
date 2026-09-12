import { RestaurantTable, Room, TableState, TableStatus } from 'model';
import { isTimedStatus, liveRoomItems } from '../table-plan-items';
import { statesByTable } from '../table-plan-summary';

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [
    {
      id: 'wall-1',
      type: 'wall',
      position: { x: 4000, y: 100 },
      size: { width: 8000, height: 120 },
      rotation: 0,
    },
  ],
  version: 2,
  ...over,
});

const table = (id: string, roomId = 'room-1'): RestaurantTable => ({
  id,
  label: id.replace('table-', ''),
  roomId,
  position: { x: 1500, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
});

const state = (tableId: string, status: TableStatus): TableState => ({
  tableId,
  restaurantId: 'restaurant-1',
  status,
  since: 1_760_000_000_000,
  updatedByUserId: 'host-1',
});

const copy = (status: TableStatus): { label: string; duration?: string } =>
  isTimedStatus(status)
    ? { label: `said:${status}`, duration: '22 min' }
    : { label: `said:${status}` };

describe('liveRoomItems', () => {
  it('draws nothing without a room', () => {
    expect(
      liveRoomItems(undefined, [table('table-1')], new Map(), copy),
    ).toEqual([]);
  });

  /**
   * Geometry first and tables second, so a table standing on a counter or a
   * banquette is still readable. The editor stores them in the same two groups.
   */
  it('draws the room geometry under the tables', () => {
    const items = liveRoomItems(room(), [table('table-1')], new Map(), copy);

    expect(items.map((item) => item.id)).toEqual(['wall-1', 'table-1']);
  });

  it('leaves the tables of other rooms out', () => {
    const items = liveRoomItems(
      room(),
      [table('table-1'), table('table-9', 'room-2')],
      new Map(),
      copy,
    );

    expect(items.map((item) => item.id)).toEqual(['wall-1', 'table-1']);
  });

  /** A restaurant opening this view for the first time sees a room of free tables. */
  it('draws a table with no state document as free', () => {
    const [, drawn] = liveRoomItems(
      room(),
      [table('table-1')],
      new Map(),
      copy,
    );

    expect(drawn.status).toBe('available');
    expect(drawn.statusLabel).toBe('said:available');
    expect(drawn.statusDuration).toBeUndefined();
  });

  it('carries the status and the time in state on to the table', () => {
    const [, drawn] = liveRoomItems(
      room(),
      [table('table-1')],
      statesByTable([state('table-1', 'occupied')]),
      copy,
    );

    expect(drawn.status).toBe('occupied');
    expect(drawn.statusLabel).toBe('said:occupied');
    expect(drawn.statusDuration).toBe('22 min');
  });

  /** Geometry has no service state, and nothing here gives it one. */
  it('puts no status on the geometry', () => {
    const [wall] = liveRoomItems(room(), [], new Map(), copy);

    expect(wall.status).toBeUndefined();
  });

  it('keeps the table number and capacity the editor drew', () => {
    const [, drawn] = liveRoomItems(
      room(),
      [table('table-6')],
      new Map(),
      copy,
    );

    expect(drawn.label).toBe('6');
    expect(drawn.seats).toBe(4);
    expect(drawn.round).toBe(true);
  });
});

describe('isTimedStatus', () => {
  /**
   * A free table has been free since whoever cleared it last, and nobody is
   * looking for that number. Every other status is something that started and
   * is expected to end.
   */
  it('runs a clock on everything except a free table', () => {
    expect(isTimedStatus('available')).toBe(false);
    expect(isTimedStatus('occupied')).toBe(true);
    expect(isTimedStatus('reserved')).toBe(true);
    expect(isTimedStatus('cleaning')).toBe(true);
    expect(isTimedStatus('disabled')).toBe(true);
  });
});
