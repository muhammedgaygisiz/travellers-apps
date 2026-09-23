import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { MyVisitsService } from 'bite-tribe/table-order-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { TableVisitBillLine, VisitSummary } from 'model';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { VisitDetailContainer } from '../visit-detail.container';

const SUMMARY = {
  id: 'visit-1',
  restaurantId: 'restaurant-1',
  restaurantName: 'Sakura Kitchen',
  tableLabel: 'Table 12',
  closedAt: 0,
  currency: 'EUR',
  lines: [],
  total: 0,
} as unknown as VisitSummary;

const LINE = {
  name: 'Margherita',
  quantity: 1,
  unitPrice: 12,
  lineTotal: 12,
} as unknown as TableVisitBillLine;

/**
 * A meal read from *My visits*, days or weeks after it was eaten.
 *
 * The same offer the table screen makes, which is why both report the same two
 * events and are told apart by `surface` alone (GitHub issue #1114). What the
 * gap between them is worth measuring for is exactly how long after a meal
 * somebody still writes about it.
 */
describe(VisitDetailContainer.name, () => {
  let container: VisitDetailContainer;
  let readOne: jest.Mock;
  let logEvent: jest.Mock;
  let cacheBite: jest.Mock;

  beforeEach(() => {
    readOne = jest.fn().mockResolvedValue({ ok: true, summary: SUMMARY });
    logEvent = jest.fn();
    cacheBite = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        VisitDetailContainer,
        { provide: MyVisitsService, useValue: { readOne } },
        { provide: BiteTribeStoreService, useValue: { cacheBite } },
        { provide: NavController, useValue: { navigateForward: jest.fn() } },
        { provide: AnalyticsService, useValue: { logEvent } },
        // Reached only through the route this page is behind, so a member is
        // the ordinary case here rather than the exception it is at a table.
        {
          provide: AuthService,
          useValue: { getMember: (): { uid: string } => ({ uid: 'member-1' }) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (): string => SUMMARY.id } },
          },
        },
      ],
    });

    container = TestBed.inject(VisitDetailContainer);
  });

  it('counts the offer when the meal is read', async () => {
    await container.load();

    expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.TableBitePromptShown, {
      restaurant_id: SUMMARY.restaurantId,
      visit_id: SUMMARY.id,
      has_account: true,
      surface: 'visit_detail',
    });
  });

  it('counts nothing while the summary is still being prepared', async () => {
    readOne.mockResolvedValue({ ok: false, reason: 'notFound' });

    await container.load();

    expect(logEvent).not.toHaveBeenCalled();
  });

  it('counts the draft where it is started rather than where it is posted', async () => {
    await container.load();
    logEvent.mockClear();

    container.startBite(LINE);

    expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.TableBiteStarted, {
      restaurant_id: SUMMARY.restaurantId,
      visit_id: SUMMARY.id,
      has_account: true,
      surface: 'visit_detail',
    });
    expect(cacheBite).toHaveBeenCalled();
  });

  it('starts nothing for a meal that never loaded', () => {
    container.startBite(LINE);

    expect(logEvent).not.toHaveBeenCalled();
    expect(cacheBite).not.toHaveBeenCalled();
  });
  it('reads the meal the route names as soon as it is on screen', async () => {
    container.ngOnInit();
    await Promise.resolve();

    expect(readOne).toHaveBeenCalledWith(SUMMARY.id);
  });

  /**
   * "Being prepared" rather than "there is none": `notFound` is also the
   * answer in the second after a close, before the trigger has written the
   * summary (`RD-TS-49`), and a guest told nothing is there would reasonably
   * conclude the restaurant lost their meal.
   */
  it('tells a summary still being written apart from an expired one', async () => {
    readOne.mockResolvedValue({ ok: false, reason: 'notFound' });
    await container.load();

    expect(container['refusalKey']()).toBe('visit-summary-preparing');

    readOne.mockResolvedValue({ ok: false, reason: 'sessionExpired' });
    await container.load();

    expect(container['refusalKey']()).toBe('visit-summary-expired');
  });

  it('says nothing about a refusal once the meal has been read', async () => {
    await container.load();

    expect(container['refusalKey']()).toBe('');
    expect(container['summary']()).toBe(SUMMARY);
  });

  it('does not read the same meal twice at once', async () => {
    const first = container.load();
    const second = container.load();

    await Promise.all([first, second]);

    expect(readOne).toHaveBeenCalledTimes(1);
  });

  it('reports the screen it is', () => {
    expect(() => container.ionViewDidEnter()).not.toThrow();
  });
});
