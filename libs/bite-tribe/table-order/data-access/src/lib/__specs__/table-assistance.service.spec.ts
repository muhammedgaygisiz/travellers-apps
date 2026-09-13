import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  TableAssistanceApiService,
  type LiveTableAssistanceRequest,
} from 'bite-tribe/api';
import type {
  RequestTableAssistanceResult,
  TableAssistanceKind,
  TableAssistanceRequest,
} from 'model';
import { BehaviorSubject } from 'rxjs';
import {
  TABLE_ASSISTANCE_REFUSAL_KEYS,
  TableAssistanceService,
} from '../table-assistance.service';

/**
 * The guest's end of a call for a waiter (GitHub issue #1106).
 *
 * What is worth asserting is the *chain*: the phone derives two document names
 * from a table it holds, an answer arriving on one of them changes what the
 * screen says without anything being tapped, and a signal raised against a
 * table the party has since been moved to re-points the pair. Those are the
 * parts a screen cannot recover from being wrong about.
 */

const RESTAURANT = 'restaurant-1';
const TABLE = 'table-12';

const signal = (
  overrides: Partial<TableAssistanceRequest> = {},
): TableAssistanceRequest => ({
  id: `${TABLE.length}_${TABLE}_callStaff`,
  restaurantId: RESTAURANT,
  tableId: TABLE,
  kind: 'callStaff',
  status: 'open',
  requestedAt: 1_757_664_000_000,
  lastRequestedAt: 1_757_664_000_000,
  requestedByUserIds: ['guest-alice'],
  ...overrides,
});

describe(TableAssistanceService.name, () => {
  let service: TableAssistanceService;
  let request: jest.Mock;
  let request$: jest.Mock;
  let feeds: Map<string, BehaviorSubject<LiveTableAssistanceRequest>>;

  const feed = (
    kind: TableAssistanceKind,
    tableId = TABLE,
  ): BehaviorSubject<LiveTableAssistanceRequest> => {
    const key = `${tableId}:${kind}`;
    const existing = feeds.get(key);

    if (existing) {
      return existing;
    }

    const created = new BehaviorSubject<LiveTableAssistanceRequest>({
      live: true,
    });
    feeds.set(key, created);

    return created;
  };

  beforeEach(() => {
    feeds = new Map();
    request = jest.fn();
    request$ = jest.fn(
      (restaurantId: string, tableId: string, kind: TableAssistanceKind) =>
        feed(kind, tableId),
    );

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TableAssistanceService,
        { provide: TableAssistanceApiService, useValue: { request, request$ } },
      ],
    });

    service = TestBed.inject(TableAssistanceService);
  });

  describe('watching', () => {
    it('subscribes to one document per kind', () => {
      service.watch(RESTAURANT, TABLE);

      expect(request$).toHaveBeenCalledTimes(2);
      expect(request$).toHaveBeenCalledWith(RESTAURANT, TABLE, 'callStaff');
      expect(request$).toHaveBeenCalledWith(RESTAURANT, TABLE, 'requestBill');
    });

    /**
     * The ordering screen calls `watch` on load and again after a request, for
     * the reason the history does: the first call can arrive before there is
     * anything to attach to. A repeated call for the same table must not tear
     * the pair down and build it again.
     */
    it('does nothing when asked to watch the table it already is', () => {
      service.watch(RESTAURANT, TABLE);
      service.watch(RESTAURANT, TABLE);

      expect(request$).toHaveBeenCalledTimes(2);
    });

    it('reads nothing asked for as idle', () => {
      service.watch(RESTAURANT, TABLE);

      expect(service.stateOf('callStaff')).toBe('idle');
      expect(service.stateOf('requestBill')).toBe('idle');
    });

    /**
     * The whole of "the guest sees that their request was received and then
     * acknowledged": the change happens on a member of staff's device, and the
     * screen follows it without anything here being called.
     */
    it('follows a signal being answered without anything being tapped', () => {
      service.watch(RESTAURANT, TABLE);

      feed('callStaff').next({ request: signal(), live: true });

      expect(service.stateOf('callStaff')).toBe('open');

      feed('callStaff').next({
        request: signal({ status: 'acknowledged' }),
        live: true,
      });

      expect(service.stateOf('callStaff')).toBe('acknowledged');
    });

    it('keeps the two kinds apart', () => {
      service.watch(RESTAURANT, TABLE);

      feed('requestBill').next({
        request: signal({ kind: 'requestBill' }),
        live: true,
      });

      expect(service.stateOf('requestBill')).toBe('open');
      expect(service.stateOf('callStaff')).toBe('idle');
    });

    /**
     * A listener the SDK detached is a button that has quietly stopped
     * updating, and a guest reading "somebody is on their way" that stopped
     * being true is worse than one told the screen is stale.
     */
    it('reports a listener that stopped delivering', () => {
      service.watch(RESTAURANT, TABLE);

      expect(service.isStale()).toBe(false);

      feed('callStaff').next({ live: false });

      expect(service.isStale()).toBe(true);
    });

    it('drops both listeners when it stops', () => {
      service.watch(RESTAURANT, TABLE);
      feed('callStaff').next({ request: signal(), live: true });

      service.stop();

      expect(service.stateOf('callStaff')).toBe('idle');
      expect(feed('callStaff').observed).toBe(false);
      expect(feed('requestBill').observed).toBe(false);
    });
  });

  describe('asking', () => {
    it('sends the restaurant, the table and the kind', async () => {
      service.watch(RESTAURANT, TABLE);
      request.mockResolvedValue({
        ok: true,
        request: signal(),
        alreadyOpen: false,
        tableStatus: 'occupied',
      } satisfies RequestTableAssistanceResult);

      await service.ask('callStaff');

      expect(request).toHaveBeenCalledWith(RESTAURANT, TABLE, 'callStaff');
    });

    it('does nothing at all before a table is known', async () => {
      await service.ask('callStaff');

      expect(request).not.toHaveBeenCalled();
    });

    it('keeps a refusal, with the reason it carried', async () => {
      service.watch(RESTAURANT, TABLE);
      request.mockResolvedValue({
        ok: false,
        reason: 'cooldown',
        retryAt: 1_757_664_060_000,
      } satisfies RequestTableAssistanceResult);

      await service.ask('callStaff');

      expect(service.lastRefusal()).toEqual({
        kind: 'callStaff',
        reason: 'cooldown',
        retryAt: 1_757_664_060_000,
      });
      expect(service.lastFailure()).toBeUndefined();
    });

    /**
     * A refusal and a call that never got through are different sentences, and
     * only one of them is something to apologise for.
     */
    it('keeps a transport failure apart from a refusal', async () => {
      service.watch(RESTAURANT, TABLE);
      request.mockResolvedValue({ ok: false, failure: 'offline' });

      await service.ask('callStaff');

      expect(service.lastFailure()).toBe('offline');
      expect(service.lastRefusal()).toBeUndefined();
    });

    /**
     * A signal names the table the party is sitting at now, which is the
     * visit's rather than the one on the sticker. A party walked to a bigger
     * table would otherwise go on watching a document nothing writes.
     */
    it('re-points the listeners at the table the signal was raised against', async () => {
      service.watch(RESTAURANT, TABLE);
      request.mockResolvedValue({
        ok: true,
        request: signal({ tableId: 'table-20' }),
        alreadyOpen: false,
        tableStatus: 'occupied',
      } satisfies RequestTableAssistanceResult);

      await service.ask('callStaff');

      expect(request$).toHaveBeenCalledWith(
        RESTAURANT,
        'table-20',
        'callStaff',
      );
      expect(feed('callStaff').observed).toBe(false);
    });

    it('clears the last answer when the guest asks for something else', async () => {
      service.watch(RESTAURANT, TABLE);
      request.mockResolvedValue({ ok: false, reason: 'cooldown' });
      await service.ask('callStaff');

      request.mockResolvedValue({
        ok: true,
        request: signal({ kind: 'requestBill' }),
        alreadyOpen: false,
        tableStatus: 'awaitingPayment',
      } satisfies RequestTableAssistanceResult);
      await service.ask('requestBill');

      expect(service.lastRefusal()).toBeUndefined();
    });

    it('forgets the last answer when asked to', async () => {
      service.watch(RESTAURANT, TABLE);
      request.mockResolvedValue({ ok: false, reason: 'cooldown' });
      await service.ask('callStaff');

      service.dismiss();

      expect(service.lastRefusal()).toBeUndefined();
    });
  });

  /**
   * A reason the backend can return and no locale file covers is a blank line
   * in front of a guest who cannot get a waiter and is not told why. The table
   * is what makes that a compile error, and this is what makes the table
   * complete.
   */
  it('has a sentence for every refusal the backend can return', () => {
    for (const key of Object.values(TABLE_ASSISTANCE_REFUSAL_KEYS)) {
      expect(key).toMatch(/^table-/);
    }
  });
});
