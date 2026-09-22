import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { VisitSummaryApiService } from 'bite-tribe/api';
import type { VisitSummary } from 'model';
import { MyVisitsService } from '../my-visits.service';

/**
 * The meals this account keeps (GitHub issue #1111).
 *
 * What is in doubt is the empty state, which is the ordinary state: almost
 * every account has nothing here, and the difference between "nothing yet" and
 * "not arrived yet" is the difference between an honest empty screen and one
 * that lies while a call is in flight.
 */
const MEAL: VisitSummary = {
  id: 'visit-1',
  restaurantId: 'r1',
  restaurantName: 'Sakura Kitchen',
  tableLabel: '12',
  closedAt: 1_700_000_000_000,
  currency: 'EUR',
  lines: [],
  total: 31,
  paymentStatus: 'settled',
};

describe('MyVisitsService', () => {
  let service: MyVisitsService;
  let list: jest.Mock;
  let read: jest.Mock;

  beforeEach(() => {
    list = jest.fn().mockResolvedValue({ ok: true, summaries: [MEAL] });
    read = jest.fn().mockResolvedValue({ ok: true, summary: MEAL });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        MyVisitsService,
        { provide: VisitSummaryApiService, useValue: { list, read } },
      ],
    });

    service = TestBed.inject(MyVisitsService);
  });

  it('holds nothing before it has loaded', () => {
    expect(service.summaries()).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  /** An empty list that has not arrived is not an empty list. */
  it('does not call itself empty until a load has come back', () => {
    expect(service.isEmpty()).toBe(false);
  });

  it('says it is empty once a load came back with nothing', async () => {
    list.mockResolvedValue({ ok: true, summaries: [] });
    await service.load();

    expect(service.isEmpty()).toBe(true);
  });

  it('keeps the meals a load returned', async () => {
    await service.load();

    expect(service.summaries()).toEqual([MEAL]);
    expect(service.isEmpty()).toBe(false);
  });

  it('reports a failed load without pretending the list is empty', async () => {
    list.mockResolvedValue({ ok: false, failure: 'offline' });
    await service.load();

    expect(service.hasFailed()).toBe(true);
    expect(service.isEmpty()).toBe(false);
  });

  it('clears the failure when a later load succeeds', async () => {
    list.mockResolvedValueOnce({ ok: false, failure: 'offline' });
    await service.load();

    list.mockResolvedValue({ ok: true, summaries: [MEAL] });
    await service.load();

    expect(service.hasFailed()).toBe(false);
  });

  it('ignores a second load while one is in flight', async () => {
    let release: (value: unknown) => void = () => undefined;
    list.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const first = service.load();
    void service.load();

    expect(list).toHaveBeenCalledTimes(1);

    release({ ok: true, summaries: [MEAL] });
    await first;
  });

  /**
   * Not taken out of the list: the detail route is addressable, and a kept
   * link arrives without a list having been loaded.
   */
  it('reads one meal on its own', async () => {
    const result = await service.readOne('visit-1');

    expect(read).toHaveBeenCalledWith('visit-1', '', '');
    expect(result).toEqual({ ok: true, summary: MEAL });
  });

  it('passes a refusal through', async () => {
    read.mockResolvedValue({ ok: false, reason: 'sessionExpired' });

    expect(await service.readOne('visit-1')).toEqual({
      ok: false,
      reason: 'sessionExpired',
    });
  });

  /** A call that never landed and a summary not written yet are one sentence. */
  it('reads a transport failure as a summary that is not there yet', async () => {
    read.mockResolvedValue({ ok: false, failure: 'offline' });

    expect(await service.readOne('visit-1')).toEqual({
      ok: false,
      reason: 'notFound',
    });
  });
});
