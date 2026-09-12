import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { ConnectionStatus } from '@capacitor/network';
import { NetworkStatusService } from 'common/networkstatus';
import { AuthService } from 'ta-firestore';
import {
  TableStateDataAccessService,
  TableTransitionRequest,
  TableTransitionResult,
} from '../table-state-data-access.service';
import {
  TableTransitionQueueService,
  TRANSITION_QUEUE_KEY_PREFIX,
} from '../table-transition-queue.service';
import { QueuedTransition } from '../table-transition-queue';
import { v4 as uuid } from 'uuid';

// Keys minted in order, reset per test, so an expectation can name one.
jest.mock('uuid', () => ({ v4: jest.fn() }));

const mintKey = uuid as jest.Mock;

// Replaced outright rather than spied on: the Capacitor plugin proxies its
// calls to a bridge that does not exist in a Node test, so there is no real
// method to stand in front of.
jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

const preferencesGet = Preferences.get as jest.Mock;
const preferencesSet = Preferences.set as jest.Mock;
const preferencesRemove = Preferences.remove as jest.Mock;

const HOST = 'host-uid';
const KEY = `${TRANSITION_QUEUE_KEY_PREFIX}${HOST}`;

/**
 * The offline queue behind the staff view (GitHub issue #1096).
 *
 * Everything below is about one of three claims the issue makes: that a
 * transition made without a signal is kept rather than lost, that replaying it
 * cannot apply it twice, and that a replay the server will not take is shown
 * rather than forced. The Firestore and Preferences plugins are replaced
 * outright - what is under test is the policy, not the bridge.
 */
describe(TableTransitionQueueService.name, () => {
  let service: TableTransitionQueueService;
  let transition: jest.Mock;
  let connected: WritableSignal<ConnectionStatus | undefined>;
  let stored: Record<string, string>;

  const seat = (
    tableId = 'table-12',
  ): Promise<ReturnType<TableTransitionQueueService['submit']>> =>
    service.submit({
      restaurantId: 'restaurant-1',
      tableId,
      status: 'occupied',
      expectedStatus: 'available',
    }) as never;

  const accepted = (
    over: Partial<TableTransitionResult> = {},
  ): TableTransitionResult => ({
    restaurantId: 'restaurant-1',
    tableId: 'table-12',
    from: 'available',
    to: 'occupied',
    since: 1_760_000_000_000,
    transitionId: 'req-request-1',
    ...over,
  });

  const goOffline = (): void => connected.set({ connected: false } as never);
  const goOnline = (): void => connected.set({ connected: true } as never);

  beforeEach(() => {
    stored = {};
    transition = jest.fn();
    connected = signal<ConnectionStatus | undefined>(undefined);

    let minted = 0;

    mintKey.mockImplementation(() => `request-${++minted}`);

    preferencesGet.mockImplementation(({ key }: { key: string }) =>
      Promise.resolve({ value: stored[key] ?? null }),
    );
    preferencesSet.mockImplementation(
      ({ key, value }: { key: string; value: string }) => {
        stored[key] = value;

        return Promise.resolve();
      },
    );
    preferencesRemove.mockImplementation(({ key }: { key: string }) => {
      delete stored[key];

      return Promise.resolve();
    });

    TestBed.configureTestingModule({
      providers: [
        TableTransitionQueueService,
        { provide: TableStateDataAccessService, useValue: { transition } },
        { provide: NetworkStatusService, useValue: { status: connected } },
        {
          provide: AuthService,
          useValue: { getUser: (): { uid: string } => ({ uid: HOST }) },
        },
      ],
    });

    service = TestBed.inject(TableTransitionQueueService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('sending a transition', () => {
    it('sends it straight through when there is a signal', async () => {
      transition.mockResolvedValue(accepted());

      const outcome = await seat();

      expect(outcome).toEqual({ outcome: 'applied', result: accepted() });
      expect(service.pending()).toEqual([]);
    });

    /** Every attempt carries a key, so a retry cannot become a second seating. */
    it('labels the request with an idempotency key', async () => {
      transition.mockResolvedValue(accepted());

      await seat();

      expect(transition).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'request-1' }),
      );
    });

    /**
     * A call made with the radio off costs the host the seconds it takes to
     * time out, and the answer at the end of them is the one already known.
     */
    it('writes it down without trying when the device knows it is offline', async () => {
      goOffline();

      const outcome = await seat();

      expect(transition).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({ outcome: 'queued' });
      expect(service.pending()).toHaveLength(1);
    });

    it('keeps the queue on the device, per account', async () => {
      goOffline();

      await seat();

      expect(JSON.parse(stored[KEY])).toEqual([
        expect.objectContaining({
          requestId: 'request-1',
          tableId: 'table-12',
          status: 'occupied',
          expectedStatus: 'available',
        }),
      ]);
    });

    /** The connection that dropped between the check and the call itself. */
    it('writes it down when the call could not be delivered', async () => {
      transition.mockRejectedValue({ code: 'functions/unavailable' });

      const outcome = await seat();

      expect(outcome).toMatchObject({ outcome: 'queued' });
      expect(service.pending()).toHaveLength(1);
    });

    /** A refusal is an answer, and an answer is never queued. */
    it('reports a refusal rather than queueing it', async () => {
      transition.mockRejectedValue({ code: 'functions/aborted' });

      const outcome = await seat();

      expect(outcome).toMatchObject({
        outcome: 'rejected',
        failure: 'conflict',
      });
      expect(service.pending()).toEqual([]);
    });
  });

  describe('replaying what is waiting', () => {
    /**
     * The acceptance criterion, in the shape a test can fail: two tables seated
     * offline are two transitions on reconnect, each sent exactly once.
     */
    it('sends each queued transition once, in the order it was made', async () => {
      goOffline();
      await seat('table-12');
      await seat('table-13');

      goOnline();
      transition.mockResolvedValue(accepted());

      const unapplied = await service.replay();

      expect(unapplied).toEqual([]);
      expect(transition).toHaveBeenCalledTimes(2);
      expect(
        transition.mock.calls.map(
          ([request]: [TableTransitionRequest]) => request.tableId,
        ),
      ).toEqual(['table-12', 'table-13']);
      expect(service.pending()).toEqual([]);
      expect(stored[KEY]).toBeUndefined();
    });

    /** Each entry is announced as it lands, not in a batch at the end. */
    it('announces every accepted transition', async () => {
      goOffline();
      await seat('table-12');
      goOnline();
      transition.mockResolvedValue(accepted());

      const seen: TableTransitionResult[] = [];
      const subscription = service.applied$.subscribe((result) =>
        seen.push(result),
      );

      await service.replay();
      subscription.unsubscribe();

      expect(seen).toEqual([accepted()]);
    });

    /**
     * The table moved while this device was away. The transition cannot be
     * applied and must not be forced, so it is dropped *and reported*.
     */
    it('surfaces a queued transition the table has moved past', async () => {
      goOffline();
      await seat('table-12');
      goOnline();
      transition.mockRejectedValue({ code: 'functions/aborted' });

      const unapplied = await service.replay();

      expect(unapplied).toEqual([
        {
          entry: expect.objectContaining({ tableId: 'table-12' }),
          failure: 'conflict',
        },
      ]);
      expect(service.pending()).toEqual([]);
    });

    /**
     * One refusal takes that table's whole chain with it. The moves behind it
     * were expecting a status the table never reached, so they are the same
     * problem rather than a second one - and a third table's changes are none
     * of their business.
     */
    it('drops the rest of a refused table and leaves other tables alone', async () => {
      goOffline();
      await seat('table-12');
      await service.submit({
        restaurantId: 'restaurant-1',
        tableId: 'table-12',
        status: 'ordering',
        expectedStatus: 'occupied',
      });
      await seat('table-13');

      goOnline();
      transition
        .mockRejectedValueOnce({ code: 'functions/aborted' })
        .mockResolvedValue(accepted({ tableId: 'table-13' }));

      const unapplied = await service.replay();

      expect(unapplied.map(({ entry }) => entry.status)).toEqual([
        'occupied',
        'ordering',
      ]);
      expect(transition).toHaveBeenCalledTimes(2);
      expect(service.pending()).toEqual([]);
    });

    /**
     * A signal that came back for one request is not a signal that stayed.
     * Nothing was decided, so nothing is dropped.
     */
    it('stops and keeps everything when the connection goes again', async () => {
      goOffline();
      await seat('table-12');
      await seat('table-13');

      goOnline();
      transition.mockRejectedValue({ code: 'functions/unavailable' });

      const unapplied = await service.replay();

      expect(unapplied).toEqual([]);
      expect(transition).toHaveBeenCalledTimes(1);
      expect(service.pending()).toHaveLength(2);
    });

    /** A signed-out session is a device that cannot deliver yet, not a refusal. */
    it('keeps everything when the session is no longer authorised', async () => {
      goOffline();
      await seat('table-12');

      goOnline();
      transition.mockRejectedValue({ code: 'functions/unauthenticated' });

      expect(await service.replay()).toEqual([]);
      expect(service.pending()).toHaveLength(1);
    });

    it('does nothing while the device is offline', async () => {
      goOffline();
      await seat('table-12');

      expect(await service.replay()).toEqual([]);
      expect(transition).not.toHaveBeenCalled();
    });

    /**
     * One reconnection can be reported more than once. Two replays of one queue
     * would send every entry twice - absorbed by the idempotency key, at the
     * cost of a round trip per entry and an audit trail nobody asked for.
     */
    it('ignores a second replay while the first is still running', async () => {
      goOffline();
      await seat('table-12');
      goOnline();

      let release: (result: TableTransitionResult) => void = () => undefined;

      transition.mockReturnValue(
        new Promise<TableTransitionResult>((resolve) => {
          release = resolve;
        }),
      );

      const first = service.replay();
      const second = await service.replay();

      release(accepted());
      await first;

      expect(second).toEqual([]);
      expect(transition).toHaveBeenCalledTimes(1);
    });
  });

  describe('surviving a restart', () => {
    /**
     * The gap can be the length of a service, and a tablet gets locked, killed
     * and reloaded inside it.
     */
    it('reads back what the last session left unsent', async () => {
      const left: QueuedTransition[] = [
        {
          requestId: 'request-from-last-night',
          restaurantId: 'restaurant-1',
          tableId: 'table-12',
          status: 'occupied',
          expectedStatus: 'available',
          queuedAt: 1_759_000_000_000,
        },
      ];

      stored[KEY] = JSON.stringify(left);

      expect(await service.restore()).toEqual(left);
    });

    /** A half-written or stale entry is dropped rather than sent. */
    it('drops what it cannot read and keeps the rest', async () => {
      stored[KEY] = JSON.stringify([
        { requestId: 'broken' },
        {
          requestId: 'request-good',
          restaurantId: 'restaurant-1',
          tableId: 'table-12',
          status: 'occupied',
          expectedStatus: 'available',
          queuedAt: 1_759_000_000_000,
        },
      ]);

      expect(await service.restore()).toEqual([
        expect.objectContaining({ requestId: 'request-good' }),
      ]);
    });

    it('treats an unreadable queue as an empty one', async () => {
      stored[KEY] = 'not json';

      expect(await service.restore()).toEqual([]);
    });

    /**
     * A transition made in the same tick as the first read must not be
     * overwritten by what comes back from storage.
     */
    it('keeps a transition made while the queue was still being read', async () => {
      stored[KEY] = JSON.stringify([
        {
          requestId: 'request-from-last-night',
          restaurantId: 'restaurant-1',
          tableId: 'table-12',
          status: 'occupied',
          expectedStatus: 'available',
          queuedAt: 1_759_000_000_000,
        },
      ]);
      goOffline();

      const [, queued] = await Promise.all([
        service.restore(),
        seat('table-13'),
      ]);

      expect(queued).toMatchObject({ outcome: 'queued' });
      expect(service.pending().map(({ tableId }) => tableId)).toEqual([
        'table-12',
        'table-13',
      ]);
    });
  });
});
