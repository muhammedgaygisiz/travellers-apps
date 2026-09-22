import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TableVisitBillApiService } from 'bite-tribe/api';
import type { TableVisitBill } from 'model';
import { TableVisitBillService } from '../table-visit-bill.service';

/**
 * What the whole table owes (GitHub issue #1110).
 *
 * The service has no listener to fake - `RD-TS-12` leaves the party's orders
 * unreadable from a guest's phone, which is why the callable exists - so what
 * is in doubt here is the state machine around one call: that an answer
 * replaces the last one whatever kind it was, that a second tap while one is
 * in flight does not send a second call, and that the bill is dropped when the
 * table changes or an order lands, because a stale total shown to somebody
 * about to pay is worse than no total.
 */
const BILL: TableVisitBill = {
  restaurantId: 'r1',
  visitId: 'v1',
  tableId: 't12',
  currency: 'EUR',
  lines: [
    {
      menuItemId: 'item-1',
      name: 'Margherita',
      quantity: 2,
      unitPrice: 12,
      lineTotal: 24,
    },
  ],
  total: 24,
  paymentStatus: 'unsettled',
  orderCount: 1,
};

describe('TableVisitBillService', () => {
  let service: TableVisitBillService;
  let read: jest.Mock;

  beforeEach(() => {
    read = jest.fn().mockResolvedValue({ ok: true, bill: BILL });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TableVisitBillService,
        { provide: TableVisitBillApiService, useValue: { read } },
      ],
    });

    service = TestBed.inject(TableVisitBillService);
  });

  it('holds nothing until it is asked', async () => {
    service.watch('r1', 't12');

    expect(service.bill()).toBeUndefined();
    expect(read).not.toHaveBeenCalled();
  });

  it('asks about the table it was pointed at', async () => {
    service.watch('r1', 't12');
    await service.load();

    expect(read).toHaveBeenCalledWith('r1', 't12');
    expect(service.bill()).toEqual(BILL);
  });

  /** Nothing to ask about is not an error, and must not be a call. */
  it('does nothing where no table has been named', async () => {
    await service.load();

    expect(read).not.toHaveBeenCalled();
  });

  it('keeps a refusal and no bill', async () => {
    read.mockResolvedValue({ ok: false, reason: 'sessionExpired' });
    service.watch('r1', 't12');
    await service.load();

    expect(service.lastRefusal()).toBe('sessionExpired');
    expect(service.bill()).toBeUndefined();
  });

  it('keeps a transport failure and no bill', async () => {
    read.mockResolvedValue({ ok: false, failure: 'offline' });
    service.watch('r1', 't12');
    await service.load();

    expect(service.lastFailure()).toBe('offline');
    expect(service.bill()).toBeUndefined();
  });

  /**
   * A guest who retried after a tunnel must not be shown the bill beside the
   * sentence saying it could not be fetched.
   */
  it('clears the last failure when a later call succeeds', async () => {
    read.mockResolvedValueOnce({ ok: false, failure: 'offline' });
    service.watch('r1', 't12');
    await service.load();

    read.mockResolvedValue({ ok: true, bill: BILL });
    await service.load();

    expect(service.lastFailure()).toBeUndefined();
    expect(service.bill()).toEqual(BILL);
  });

  it('drops the bill when a refusal follows a success', async () => {
    service.watch('r1', 't12');
    await service.load();

    read.mockResolvedValue({ ok: false, reason: 'visitClosed' });
    await service.load();

    expect(service.bill()).toBeUndefined();
    expect(service.lastRefusal()).toBe('visitClosed');
  });

  /** One tap, one call. A guest jabbing the button is not four bills. */
  it('ignores a second load while one is in flight', async () => {
    let release: (value: unknown) => void = () => undefined;
    read.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    service.watch('r1', 't12');

    const first = service.load();
    void service.load();

    expect(read).toHaveBeenCalledTimes(1);

    release({ ok: true, bill: BILL });
    await first;
  });

  /**
   * The party ordered again while the bill was on screen. There is no listener
   * behind it, so it cannot learn that on its own - `TableOrderService` clears
   * it, and the next open fetches.
   */
  it('forgets the bill when it is cleared', async () => {
    service.watch('r1', 't12');
    await service.load();

    service.clear();

    expect(service.bill()).toBeUndefined();
  });

  it('forgets the bill when pointed at another table', async () => {
    service.watch('r1', 't12');
    await service.load();

    service.watch('r1', 't9');

    expect(service.bill()).toBeUndefined();
  });

  it('stays put when pointed at the table it is already on', async () => {
    service.watch('r1', 't12');
    await service.load();

    service.watch('r1', 't12');

    expect(service.bill()).toEqual(BILL);
  });

  /** Two zero totals, two sentences - which is what `orderCount` is for. */
  it('separates a party that ordered nothing from one whose order was cancelled', async () => {
    read.mockResolvedValue({
      ok: true,
      bill: { ...BILL, lines: [], total: 0, orderCount: 0 },
    });
    service.watch('r1', 't12');
    await service.load();

    expect(service.isEmpty()).toBe(true);

    read.mockResolvedValue({
      ok: true,
      bill: { ...BILL, lines: [], total: 0, orderCount: 1 },
    });
    await service.load();

    expect(service.isEmpty()).toBe(false);
  });

  it('reports a settled bill', async () => {
    read.mockResolvedValue({
      ok: true,
      bill: { ...BILL, paymentStatus: 'settled', settlementMethod: 'cash' },
    });
    service.watch('r1', 't12');
    await service.load();

    expect(service.isSettled()).toBe(true);
  });
});
