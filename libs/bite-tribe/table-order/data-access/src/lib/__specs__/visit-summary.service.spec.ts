import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { VisitSummaryApiService } from 'bite-tribe/api';
import type { VisitSummary } from 'model';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { VisitSummaryService } from '../visit-summary.service';

const SUMMARY = {
  id: 'visit-1',
  restaurantId: 'restaurant-1',
  restaurantName: 'Sakura Kitchen',
  tableLabel: 'Table 12',
  closedAt: 0,
  currency: 'EUR',
  lines: [],
  total: 0,
  paymentStatus: 'settled',
} as unknown as VisitSummary;

/**
 * What this service reports to the order-to-Bite funnel (GitHub issue #1114).
 *
 * The offer to turn a meal into a Bite is counted where the summary lands
 * rather than from the template: a component cannot say "shown" once, because
 * it re-renders, and the taxonomy keeps emission in the integration layer.
 */
describe(VisitSummaryService.name, () => {
  let service: VisitSummaryService;
  let read: jest.Mock;
  let logEvent: jest.Mock;
  let getMember: jest.Mock;

  const build = (): VisitSummaryService => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        VisitSummaryService,
        {
          provide: VisitSummaryApiService,
          useValue: { read, email: jest.fn() },
        },
        { provide: AnalyticsService, useValue: { logEvent } },
        { provide: AuthService, useValue: { getMember } },
      ],
    });

    return TestBed.inject(VisitSummaryService);
  };

  beforeEach(() => {
    read = jest.fn().mockResolvedValue({ ok: true, summary: SUMMARY });
    logEvent = jest.fn();
    getMember = jest.fn().mockReturnValue(null);
    service = build();
    service.watch(SUMMARY.id, SUMMARY.restaurantId, 'table-12');
  });

  it('counts the offer once the meal is on screen', async () => {
    await service.load();

    expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.TableBitePromptShown, {
      restaurant_id: SUMMARY.restaurantId,
      visit_id: SUMMARY.id,
      has_account: false,
      surface: 'table',
    });
  });

  /**
   * The screen offers another look while the trigger is still writing the
   * summary (`RD-TS-49`), so a guest who taps twice saw one offer.
   */
  it('counts one offer however many times the guest looks', async () => {
    await service.load();
    await service.load();

    expect(
      logEvent.mock.calls.filter(
        ([name]) => name === AnalyticsEvent.TableBitePromptShown,
      ),
    ).toHaveLength(1);
  });

  it('counts nothing while the summary is still being prepared', async () => {
    read.mockResolvedValue({ ok: false, reason: 'notFound' });

    await service.load();

    expect(logEvent).not.toHaveBeenCalled();
    expect(service.isPreparing()).toBe(true);
  });

  it('counts nothing when the read could not be made at all', async () => {
    read.mockResolvedValue({ ok: false, failure: 'offline' });

    await service.load();

    expect(logEvent).not.toHaveBeenCalled();
    expect(service.lastFailure()).toBe('offline');
  });

  it('says whether BiteTribe already had this guest', async () => {
    getMember.mockReturnValue({ uid: 'member-1' });

    await service.load();

    expect(logEvent).toHaveBeenCalledWith(
      AnalyticsEvent.TableBitePromptShown,
      expect.objectContaining({ has_account: true }),
    );
  });
});
