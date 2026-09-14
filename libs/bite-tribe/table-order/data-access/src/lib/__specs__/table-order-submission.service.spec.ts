import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TableOrderApiService } from 'bite-tribe/api';
import { NetworkStatusService } from 'common/networkstatus';
import type { ConnectionStatus } from '@capacitor/network';
import type { SubmitTableOrderRequest } from 'model';
import {
  PENDING_ORDER_KEY_PREFIX,
  SUBMIT_RETRY_DELAYS_MS,
  TableOrderSubmissionService,
} from '../table-order-submission.service';
import {
  PENDING_ORDER_MAX_AGE_MS,
  type PendingTableOrder,
} from '../pending-table-order';

/**
 * Sending a cart over a restaurant's wifi (GitHub issue #1108).
 *
 * Four claims live here and nowhere else, because all four are about what the
 * *phone* does between a tap and an answer - which the emulator spec cannot
 * see and the screen spec should not have to reconstruct.
 *
 * **One key per intent.** Every attempt at one submission carries the same
 * key, and two submissions carry two. That is the client half of "submitting
 * the same idempotency key twice produces one order"; the backend half is in
 * `table-orders.emulator-spec.ts`.
 *
 * **The intent outlives the process.** The record is written before the first
 * attempt, not after it, because a record written afterwards would be missing
 * for exactly the request whose answer was lost.
 *
 * **An answer of any kind ends it.** Taken or declined, the restaurant has
 * spoken and there is nothing left to recover.
 *
 * **The two failures are told apart.** A phone that never made a call knows the
 * order did not arrive; a phone whose call came back with nothing does not.
 */

const mockDeviceStorage = new Map<string, string>();

jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: ({ key }: { key: string }): Promise<{ value: string | null }> =>
      Promise.resolve({ value: mockDeviceStorage.get(key) ?? null }),
    set: ({ key, value }: { key: string; value: string }): Promise<void> => {
      mockDeviceStorage.set(key, value);

      return Promise.resolve();
    },
    remove: ({ key }: { key: string }): Promise<void> => {
      mockDeviceStorage.delete(key);

      return Promise.resolve();
    },
  },
}));

const RESTAURANT = 'restaurant-1';
const TABLE = 'table-12';

const KEY = `${PENDING_ORDER_KEY_PREFIX}${RESTAURANT}:${TABLE}`;

const REQUEST: Omit<SubmitTableOrderRequest, 'requestId'> = {
  restaurantId: RESTAURANT,
  tableId: TABLE,
  currency: 'EUR',
  lines: [{ menuItemId: 'item-margherita', quantity: 2, price: 12 }],
};

const ORDER = {
  ok: true,
  order: { id: 'req-abcdefgh', total: 24 },
  tableStatus: 'ordering',
};

/** Long enough for every backoff this service has, plus room to spare. */
const PAST_EVERY_BACKOFF =
  SUBMIT_RETRY_DELAYS_MS.reduce((sum, ms) => sum + ms, 0) + 1_000;

describe(TableOrderSubmissionService.name, () => {
  let service: TableOrderSubmissionService;
  let submit: jest.Mock;
  let status: ReturnType<typeof signal<ConnectionStatus | undefined>>;

  const build = (): TableOrderSubmissionService => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TableOrderSubmissionService,
        { provide: TableOrderApiService, useValue: { submit } },
        { provide: NetworkStatusService, useValue: { status } },
      ],
    });

    return TestBed.inject(TableOrderSubmissionService);
  };

  /** Runs a call to completion, letting every backoff between attempts pass. */
  const settle = async <TResult>(
    running: Promise<TResult>,
  ): Promise<TResult> => {
    await jest.advanceTimersByTimeAsync(PAST_EVERY_BACKOFF);

    return running;
  };

  const stored = (): PendingTableOrder | undefined => {
    const raw = mockDeviceStorage.get(KEY);

    return raw ? (JSON.parse(raw) as PendingTableOrder) : undefined;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockDeviceStorage.clear();
    status = signal<ConnectionStatus | undefined>({
      connected: true,
      connectionType: 'wifi',
    });
    submit = jest.fn().mockResolvedValue(ORDER);
    service = build();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('an order that goes through', () => {
    it('labels the submission with an idempotency key', async () => {
      await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalledTimes(1);
      expect(submit.mock.calls[0][0].requestId).toEqual(expect.any(String));
    });

    /**
     * The key identifies a tap, not a phone. Two carts sent from one table are
     * two dinners and have to be able to be.
     */
    it('mints a new key for a second submission', async () => {
      await settle(service.send(REQUEST));
      await settle(service.send(REQUEST));

      expect(submit.mock.calls[0][0].requestId).not.toBe(
        submit.mock.calls[1][0].requestId,
      );
    });

    it('answers with the order the restaurant took', async () => {
      const outcome = await settle(service.send(REQUEST));

      expect(outcome).toEqual({ outcome: 'placed', result: ORDER });
    });

    /** Nothing is left to recover once the restaurant has the order. */
    it('forgets the submission once it has an answer', async () => {
      await settle(service.send(REQUEST));

      expect(stored()).toBeUndefined();
      expect(service.pending()).toBeUndefined();
    });

    /**
     * Written down *before* the attempt. A record written afterwards would be
     * missing for exactly the request whose answer was lost.
     */
    it('records the submission before it is sent', async () => {
      submit.mockImplementation(() => {
        expect(stored()?.lines).toEqual(REQUEST.lines);

        return Promise.resolve(ORDER);
      });

      await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalled();
    });
  });

  describe('an order the restaurant declined', () => {
    it('answers with the reason and the item it was about', async () => {
      submit.mockResolvedValue({
        ok: false,
        reason: 'itemUnavailable',
        item: { menuItemId: 'item-margherita', name: 'Margherita' },
      });

      const outcome = await settle(service.send(REQUEST));

      expect(outcome).toEqual({
        outcome: 'refused',
        reason: 'itemUnavailable',
        item: { menuItemId: 'item-margherita', name: 'Margherita' },
      });
    });

    /**
     * A refusal is an answer. The restaurant has spoken, so there is nothing
     * that might still be an order and nothing left to retry.
     */
    it('forgets the submission, because there is nothing to recover', async () => {
      submit.mockResolvedValue({ ok: false, reason: 'emptyOrder' });

      await settle(service.send(REQUEST));

      expect(stored()).toBeUndefined();
    });

    it('does not retry it', async () => {
      submit.mockResolvedValue({ ok: false, reason: 'itemMissing' });

      await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalledTimes(1);
    });
  });

  describe('a restaurant network that drops things', () => {
    const lost = { ok: false, failure: 'offline' } as const;

    it('tries again, under the same key every time', async () => {
      submit.mockResolvedValue(lost);

      await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalledTimes(SUBMIT_RETRY_DELAYS_MS.length + 1);
      expect(
        new Set(submit.mock.calls.map((call) => call[0].requestId)).size,
      ).toBe(1);
    });

    it('stops at the first attempt that gets through', async () => {
      submit.mockResolvedValueOnce(lost).mockResolvedValue(ORDER);

      const outcome = await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalledTimes(2);
      expect(outcome.outcome).toBe('placed');
    });

    /**
     * The issue's explicit failure state. The record is kept, because the order
     * may exist and the guest is owed a way to find out.
     */
    it('keeps the submission and says it could not be confirmed', async () => {
      submit.mockResolvedValue(lost);

      const outcome = await settle(service.send(REQUEST));

      expect(outcome).toMatchObject({
        outcome: 'unconfirmed',
        delivery: 'unknown',
        failure: 'offline',
      });
      expect(stored()?.requestId).toBe(service.pending()?.requestId);
    });

    /**
     * Retrying a limit is how a limit becomes a block, and the guest's own
     * retry button is a better clock than a loop.
     */
    it('does not hammer a backend that asked it to stop', async () => {
      submit.mockResolvedValue({ ok: false, failure: 'rateLimited' });

      const outcome = await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalledTimes(1);
      expect(outcome).toMatchObject({ failure: 'rateLimited' });
    });
  });

  describe('a phone with no signal at all', () => {
    beforeEach(() => {
      status.set({ connected: false, connectionType: 'none' });
    });

    /**
     * A call made with the radio off costs the guest the seconds it takes to
     * time out, and the answer at the end of them is known already.
     */
    it('does not call at all', async () => {
      await settle(service.send(REQUEST));

      expect(submit).not.toHaveBeenCalled();
    });

    /**
     * And says the order did not arrive rather than that it might have. A doubt
     * invented here is a guest who orders the same dinner twice to be sure.
     */
    it('tells the guest the order did not reach the restaurant', async () => {
      const outcome = await settle(service.send(REQUEST));

      expect(outcome).toMatchObject({
        outcome: 'unconfirmed',
        delivery: 'notSent',
      });
    });

    it('keeps it so it can be sent when the signal comes back', async () => {
      await settle(service.send(REQUEST));

      expect(stored()?.lines).toEqual(REQUEST.lines);
    });

    /**
     * An unknown status counts as connected. It is `undefined` until the first
     * `Network.getStatus()` resolves, and treating that as offline would hold
     * the first order of every session behind a reconnect that never has to
     * happen.
     */
    it('treats an unknown status as a connection', async () => {
      status.set(undefined);

      await settle(service.send(REQUEST));

      expect(submit).toHaveBeenCalled();
    });
  });

  describe('a submission a previous screen left behind', () => {
    const left = (sentAt: number): PendingTableOrder => ({
      requestId: 'abcdefgh-left-behind',
      restaurantId: RESTAURANT,
      tableId: TABLE,
      currency: 'EUR',
      lines: REQUEST.lines,
      sentAt,
    });

    const leave = (pending: PendingTableOrder): void => {
      mockDeviceStorage.set(KEY, JSON.stringify(pending));
    };

    it('reads it back after a reload', async () => {
      leave(left(1_000));

      expect(await service.restore(RESTAURANT, TABLE, 2_000)).toMatchObject({
        requestId: 'abcdefgh-left-behind',
      });
    });

    /**
     * Sending it again *is* the question. The backend answers a key it has
     * already seen with the order it wrote, so one request either reconciles
     * the phone with the truth or places the order nobody ever answered.
     */
    it('sends it again under its own key', async () => {
      leave(left(1_000));
      const pending = await service.restore(RESTAURANT, TABLE, 2_000);

      await settle(service.resend(pending as PendingTableOrder));

      expect(submit.mock.calls[0][0].requestId).toBe('abcdefgh-left-behind');
    });

    /**
     * An order arriving in a dining room the guest left hours ago is worse than
     * a record nobody is watching for.
     */
    it('drops one older than a meal rather than handing it back', async () => {
      leave(left(1_000));

      expect(
        await service.restore(
          RESTAURANT,
          TABLE,
          1_000 + PENDING_ORDER_MAX_AGE_MS + 1,
        ),
      ).toBeUndefined();
      expect(stored()).toBeUndefined();
    });

    /** A half-written entry is dropped rather than sent as a malformed order. */
    it('ignores an entry it cannot read', async () => {
      mockDeviceStorage.set(KEY, '{"requestId":"short"}');

      expect(await service.restore(RESTAURANT, TABLE, 2_000)).toBeUndefined();
    });

    it('answers nothing where this table left none', async () => {
      expect(await service.restore(RESTAURANT, TABLE, 2_000)).toBeUndefined();
    });
  });

  describe('a guest tapping twice', () => {
    /**
     * The button is disabled while a send runs, so reaching here means a second
     * entry point - and the answer to it is the same one the disabled button
     * gives: nothing goes out.
     */
    it('does not start a second send while one is running', async () => {
      submit.mockResolvedValue({ ok: false, failure: 'offline' });

      const first = service.send(REQUEST);
      const second = service.send(REQUEST);

      await settle(Promise.all([first, second]));

      expect(submit).toHaveBeenCalledTimes(SUBMIT_RETRY_DELAYS_MS.length + 1);
    });
  });
});
