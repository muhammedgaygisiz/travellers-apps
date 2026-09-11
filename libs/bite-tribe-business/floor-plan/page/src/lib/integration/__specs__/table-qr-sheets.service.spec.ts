import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  FloorPlanDataAccessService,
  IssueTableQrTokensResult,
} from 'bite-tribe-business/floor-plan-data-access';
import { RestaurantTable, Room } from 'model';
import { of } from 'rxjs';
import { ALL_ROOMS, TableQrSheetsService } from '../table-qr-sheets.service';

// Only the restaurant name is read this way; everything else goes through the
// data-access mock below.
jest.mock('@capacitor-firebase/firestore');

const getDocument = FirebaseFirestore.getDocument as jest.Mock;

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 1,
  ...over,
});

const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
  ({
    id: 'table-1',
    label: '1',
    roomId: 'room-1',
    shape: 'rectangle',
    size: { width: 1200, height: 800 },
    position: { x: 3000, y: 3000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

const token = (tableId: string, label: string): string =>
  `TOKEN${tableId}${label}`.toUpperCase();

describe(TableQrSheetsService.name, () => {
  let service: TableQrSheetsService;
  let restaurantId: ReturnType<typeof signal<string | undefined>>;
  let storedRooms: Room[];
  let storedTables: RestaurantTable[];
  let loadRooms: jest.Mock;
  let loadTables: jest.Mock;
  let issueTableQrTokens: jest.Mock;

  /**
   * Lets the resources settle before the assertion.
   *
   * Two rounds, because the reads are chained: the sheet resource is keyed on
   * the rooms the rooms resource produces, so it does not start until that one
   * has settled and a single round leaves it loading. The same shape the
   * editor's own service spec uses.
   */
  const loaded = async (): Promise<void> => {
    for (let round = 0; round < 2; round += 1) {
      TestBed.tick();

      for (let tick = 0; tick < 20; tick += 1) {
        await Promise.resolve();
      }

      TestBed.tick();
    }
  };

  const labels = (): string[] => service.rows().map((row) => row.label);

  beforeEach(() => {
    restaurantId = signal<string | undefined>('china-wok');
    storedRooms = [room()];
    storedTables = [table()];

    getDocument.mockReset();
    getDocument.mockResolvedValue({
      snapshot: { id: 'china-wok', data: { name: 'China Wok' } },
    });

    loadRooms = jest.fn(() => Promise.resolve(storedRooms));
    loadTables = jest.fn(() => Promise.resolve(storedTables));
    issueTableQrTokens = jest.fn((): Promise<IssueTableQrTokensResult> =>
      Promise.resolve({
        restaurantId: 'china-wok',
        tokens: storedTables
          .filter((entry) => entry.enabled)
          .map((entry) => ({
            tableId: entry.id,
            label: entry.label,
            token: token(entry.id, entry.label),
            status: 'existing' as const,
          })),
        skippedTableIds: storedTables
          .filter((entry) => !entry.enabled)
          .map((entry) => entry.id),
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        TableQrSheetsService,
        {
          provide: FloorPlanDataAccessService,
          useValue: { loadRooms, loadTables, issueTableQrTokens },
        },
        {
          provide: BiteTribeStoreService,
          useValue: {
            restaurantIdFromUrl: restaurantId,
            isAuthenticated$: of(true),
            logout: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(TableQrSheetsService);
  });

  describe('what the sheet is built from', () => {
    it('asks for the tokens as part of loading, without a button', async () => {
      // Issuing is idempotent, so an owner who has just built a plan reaches a
      // sheet that is ready to print rather than one that first explains it
      // needs codes.
      await loaded();

      expect(issueTableQrTokens).toHaveBeenCalledWith('china-wok');
    });

    it('takes the token off the call rather than off the table', async () => {
      // `issueTableQrTokens` writes `qrTokenId` onto the tables it mints for,
      // so the tables read a moment earlier are stale for exactly the tables
      // that matter.
      storedTables = [table({ qrTokenId: 'STALE' })];
      await loaded();

      expect(service.rows()[0].token).toBe(token('table-1', '1'));
    });

    it('names the room each code belongs to', async () => {
      await loaded();

      expect(service.rows()[0].roomName).toBe('Main dining room');
    });

    it('leaves a table that is out of service off the sheet', async () => {
      storedTables = [
        table(),
        table({ id: 'table-2', label: '2', enabled: false }),
      ];
      await loaded();

      expect(labels()).toEqual(['1']);
      expect(service.disabledLabels()).toEqual(['2']);
    });

    it('names an enabled table the backend issued no token for', async () => {
      // Not expected, and therefore reported: a row silently dropped is one the
      // owner finds missing by walking the room a sticker short.
      storedTables = [table(), table({ id: 'table-2', label: '2' })];
      issueTableQrTokens.mockResolvedValue({
        restaurantId: 'china-wok',
        tokens: [
          {
            tableId: 'table-1',
            label: '1',
            token: token('table-1', '1'),
            status: 'existing',
          },
        ],
        skippedTableIds: [],
      });
      await loaded();

      expect(labels()).toEqual(['1']);
      expect(service.missingTokenLabels()).toEqual(['2']);
    });

    it('orders the rows by room and then by number, not alphabetically', async () => {
      // A sheet of stickers is peeled off in order and carried around the room,
      // so table 2 has to come before table 10 rather than after it.
      storedRooms = [room(), room({ id: 'room-2', name: 'Terrace', order: 1 })];
      storedTables = [
        table({ id: 'table-3', label: '10' }),
        table({ id: 'table-4', label: '2', roomId: 'room-2' }),
        table({ id: 'table-5', label: '2' }),
      ];
      await loaded();

      expect(
        service.rows().map((row) => `${row.roomName} ${row.label}`),
      ).toEqual(['Main dining room 2', 'Main dining room 10', 'Terrace 2']);
    });

    it('reports a failed read rather than an empty restaurant', async () => {
      loadRooms.mockRejectedValue(new Error('offline'));
      await loaded();

      expect(service.loadFailed()).toBe(true);
      expect(service.rows()).toEqual([]);
    });

    it('reports a refused token call the same way', async () => {
      issueTableQrTokens.mockRejectedValue(new Error('permission-denied'));
      await loaded();

      expect(service.loadFailed()).toBe(true);
    });
  });

  describe('what the owner chooses', () => {
    beforeEach(() => {
      storedRooms = [room(), room({ id: 'room-2', name: 'Terrace', order: 1 })];
      storedTables = [
        table(),
        table({ id: 'table-2', label: '2' }),
        table({ id: 'table-3', label: '3', roomId: 'room-2' }),
      ];
    });

    it('selects every table by default, so the common case is one click', async () => {
      await loaded();

      expect(service.selectedRows()).toHaveLength(3);
    });

    it('narrows the sheet to one room', async () => {
      await loaded();
      service.setRoom('room-2');

      expect(service.visibleRows().map((row) => row.label)).toEqual(['3']);
    });

    it('resets the selection when the room filter moves', async () => {
      // A selection that survived the filter would print tables the owner can
      // no longer see.
      await loaded();
      service.toggleTable('table-1');
      service.setRoom('room-2');

      expect(service.selectedRows().map((row) => row.label)).toEqual(['3']);
    });

    it('unticks one table for a reprint of the rest', async () => {
      await loaded();
      service.toggleTable('table-2');

      expect(service.selectedRows().map((row) => row.label)).toEqual([
        '1',
        '3',
      ]);
    });

    it('reprints a single replacement without touching anyone else', async () => {
      // The acceptance criterion. Nothing here rotates, so the other tables'
      // codes are the ones already stuck to them.
      await loaded();
      service.selectAll(false);
      service.toggleTable('table-2');

      expect(service.selectedRows().map((row) => row.label)).toEqual(['2']);
      expect(issueTableQrTokens).toHaveBeenCalledTimes(1);
    });

    it('ticks and unticks everything visible in one action', async () => {
      await loaded();
      service.selectAll(false);

      expect(service.selectedRows()).toEqual([]);

      service.selectAll(true);

      expect(service.selectedRows()).toHaveLength(3);
    });

    it('offers only the rooms that hold a printable table', async () => {
      storedTables = [table()];
      await loaded();

      expect(service.filterRooms().map((entry) => entry.name)).toEqual([
        'Main dining room',
      ]);
    });

    it('starts on the sticker sheet, showing every room', async () => {
      await loaded();

      expect(service.layout()).toBe('sticker');
      expect(service.room()).toBe(ALL_ROOMS);
    });

    it('switches to the tent layout', async () => {
      await loaded();
      service.setLayout('tent');

      expect(service.layout()).toBe('tent');
    });
  });

  describe('printing', () => {
    it('hands the page to the browser rather than opening a window', async () => {
      // A popup is blocked by default in every browser this app runs in, and
      // the failure is silent.
      const print = jest
        .spyOn(window, 'print')
        .mockImplementation(() => undefined);

      await loaded();
      service.print();

      expect(print).toHaveBeenCalled();
      print.mockRestore();
    });
  });

  it('reads nothing before the route carries a restaurant', async () => {
    restaurantId.set(undefined);
    await loaded();

    expect(issueTableQrTokens).not.toHaveBeenCalled();
    expect(service.rows()).toEqual([]);
  });
});
