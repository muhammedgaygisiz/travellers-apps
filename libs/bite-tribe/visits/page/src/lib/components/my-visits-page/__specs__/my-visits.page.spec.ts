import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { VisitSummary } from 'model';
import { MyVisitsPage } from '../my-visits.page';

/**
 * Every meal this account keeps (GitHub issue #1111).
 *
 * The four states this list can be in, and the one thing a row has to do. The
 * empty state gets a test of its own because it is the **ordinary** state for
 * now: table ordering needs a restaurant with a floor plan, printed codes and
 * a published menu, so for almost every account there is nothing here yet -
 * and a list that says nothing at all in that case reads as broken.
 */
const en = {
  'my-visits': 'My visits',
  'my-visits-empty':
    "Your visits appear here after you've ordered at a table with a BiteTribe code.",
  'my-visits-failed': "We couldn't load your visits.",
  'my-visits-retry': 'Try again',
};

const MEAL: VisitSummary = {
  id: 'visit-1',
  restaurantId: 'r1',
  restaurantName: 'Sakura Kitchen',
  tableLabel: '12',
  closedAt: Date.parse('2026-09-16T18:00:00Z'),
  currency: 'EUR',
  lines: [],
  total: 31,
  paymentStatus: 'settled',
};

describe(MyVisitsPage.name, () => {
  let fixture: ComponentFixture<MyVisitsPage>;
  let ref: ComponentRef<MyVisitsPage>;

  const text = (): string => fixture.nativeElement.textContent ?? '';

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const all = (testId: string): HTMLElement[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`),
    );

  const render = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MyVisitsPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyVisitsPage);
    ref = fixture.componentRef;
  });

  it('shows a spinner while it loads', () => {
    render({ loading: true });

    expect(query('my-visits-loading')).not.toBeNull();
  });

  /**
   * Before a load has come back, an empty list is a list that has not arrived.
   * Telling somebody they have eaten nowhere while the call is in flight is
   * the kind of empty state people screenshot.
   */
  it('does not say the list is empty until it knows', () => {
    render({ loading: true, empty: false });

    expect(query('my-visits-empty')).toBeNull();
  });

  it('says what would put something here when there is nothing', () => {
    render({ empty: true });

    expect(text()).toContain('ordered at a table with a BiteTribe code');
  });

  it('offers another go when the load failed', () => {
    const retries: number[] = [];
    fixture.componentInstance.retry.subscribe(() => retries.push(1));

    render({ failed: true });
    query('my-visits-retry')?.click();

    expect(text()).toContain("We couldn't load your visits.");
    expect(retries).toHaveLength(1);
  });

  it('lists a row per meal, with where and what it came to', () => {
    render({ summaries: [MEAL] });

    expect(all('my-visits-row')).toHaveLength(1);
    expect(text()).toContain('Sakura Kitchen');
    expect(text()).toContain('31 €');
  });

  /** The whole row is the target, because a thumb is aiming at it. */
  it('opens the visit the row names', () => {
    const opened: string[] = [];
    fixture.componentInstance.openVisit.subscribe((id) => opened.push(id));

    render({ summaries: [MEAL] });
    query('my-visits-row')?.click();

    expect(opened).toEqual(['visit-1']);
  });

  it('falls back to the currency code where no symbol is known', () => {
    render({ summaries: [{ ...MEAL, currency: 'XYZ' }] });

    expect(text()).toContain('31 XYZ');
  });
});
