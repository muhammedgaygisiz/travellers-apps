import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import {
  SETTLE_TABLE_VISIT_CALLABLE,
  TableSettlementService,
} from '../table-settlement.service';

/**
 * Staff recording that a party paid (GitHub issue #1110).
 *
 * `@capacitor-firebase/functions` is mocked rather than spied on, following
 * the rest of this workspace: the plugin has no web implementation registered
 * in a Jest environment, so a spy would be installed on a method that throws
 * before it is reached.
 */
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;

const ANSWER = {
  ok: true,
  visitId: 'visit-1',
  method: 'card',
  settledAt: 1_700_000_000_000,
  settledByUserId: 'host-uid',
  changed: true,
};

describe('TableSettlementService', () => {
  let service: TableSettlementService;

  beforeEach(() => {
    callByName.mockReset();
    callByName.mockResolvedValue({ data: ANSWER });

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), TableSettlementService],
    });

    service = TestBed.inject(TableSettlementService);
  });

  it('names the visit rather than the table', async () => {
    await service.settle('r1', 'visit-1', 'card');

    expect(callByName).toHaveBeenCalledWith({
      name: SETTLE_TABLE_VISIT_CALLABLE,
      data: { restaurantId: 'r1', visitId: 'visit-1', method: 'card' },
    });
  });

  /**
   * No amount is sent, and that is the decision rather than an omission: an
   * amount typed by staff could disagree with the orders, and a second
   * contradictory account of what the party owed is what `RD-TS-16` refused
   * for cancellations.
   */
  it('sends no amount', async () => {
    await service.settle('r1', 'visit-1', 'cash');

    const sent = callByName.mock.calls[0][0].data as Record<string, unknown>;

    expect(Object.keys(sent).sort()).toEqual([
      'method',
      'restaurantId',
      'visitId',
    ]);
  });

  it('answers with what the backend recorded', async () => {
    const result = await service.settle('r1', 'visit-1', 'card');

    expect(result).toEqual(ANSWER);
    expect(service.settled()).toEqual(ANSWER);
    expect(service.failed()).toBe(false);
  });

  /**
   * A second press is not a conflict (`RD-TS-22`). The backend answers with
   * the first press's values and `changed: false`, and the caller distinguishes
   * the two sentences from that.
   */
  it('passes through an already-settled answer', async () => {
    callByName.mockResolvedValue({ data: { ...ANSWER, changed: false } });

    const result = await service.settle('r1', 'visit-1', 'cash');

    expect(result?.changed).toBe(false);
  });

  it('reports a transport failure instead of throwing', async () => {
    callByName.mockRejectedValue(new Error('offline'));

    const result = await service.settle('r1', 'visit-1', 'card');

    expect(result).toBeUndefined();
    expect(service.failed()).toBe(true);
  });

  it('clears the failure when a later call succeeds', async () => {
    callByName.mockRejectedValueOnce(new Error('offline'));
    await service.settle('r1', 'visit-1', 'card');

    callByName.mockResolvedValue({ data: ANSWER });
    await service.settle('r1', 'visit-1', 'card');

    expect(service.failed()).toBe(false);
  });

  /** One press, one call. A staff member tapping twice is not two records. */
  it('ignores a second settle while one is in flight', async () => {
    let release: (value: unknown) => void = () => undefined;
    callByName.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const first = service.settle('r1', 'visit-1', 'card');
    const second = await service.settle('r1', 'visit-1', 'cash');

    expect(second).toBeUndefined();
    expect(callByName).toHaveBeenCalledTimes(1);

    release({ data: ANSWER });
    await first;

    expect(service.busy()).toBeUndefined();
  });

  it('frees itself again after a failure', async () => {
    callByName.mockRejectedValue(new Error('offline'));
    await service.settle('r1', 'visit-1', 'card');

    expect(service.busy()).toBeUndefined();
  });

  it('forgets the last answer when cleared', async () => {
    await service.settle('r1', 'visit-1', 'card');

    service.clear();

    expect(service.settled()).toBeUndefined();
    expect(service.failed()).toBe(false);
  });
});
