import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { VisitSummary } from 'model';
import { VisitSummaryComponent } from '../visit-summary.component';

/**
 * What a guest ate, rendered (GitHub issue #1111).
 *
 * The component decides nothing, so what is asserted here is the rendering
 * itself: that a variant and its extras reach the row, that the two empty
 * bills read differently, and that the sentence saying this is not a receipt
 * is part of the document rather than of whichever screen is showing it
 * (`ADR-0004`).
 */
const en = {
  'visit-summary-where': '{{restaurant}}, table {{table}}',
  'visit-summary-total': 'Total {{total}}',
  'visit-summary-empty': 'Nothing was ordered at this table.',
  'visit-summary-not-a-receipt':
    'This is a summary of what was ordered, not a receipt.',
};

const MEAL: VisitSummary = {
  id: 'visit-1',
  restaurantId: 'r1',
  restaurantName: 'Sakura Kitchen',
  tableLabel: '12',
  closedAt: 1_700_000_000_000,
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
  paymentStatus: 'settled',
};

describe(VisitSummaryComponent.name, () => {
  let fixture: ComponentFixture<VisitSummaryComponent>;
  let ref: ComponentRef<VisitSummaryComponent>;

  const text = (): string => fixture.nativeElement.textContent ?? '';

  const has = (testId: string): boolean =>
    !!fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const render = (summary: VisitSummary, showsFootnote = true): void => {
    ref.setInput('summary', summary);
    ref.setInput('showsFootnote', showsFootnote);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VisitSummaryComponent,
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
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitSummaryComponent);
    ref = fixture.componentRef;
  });

  it('names where the guest ate', () => {
    render(MEAL);

    expect(text()).toContain('Sakura Kitchen, table 12');
  });

  it('lists the dishes with their totals', () => {
    render(MEAL);

    expect(text()).toContain('2 × Margherita');
    expect(text()).toContain('24 €');
    expect(text()).toContain('Total 24 €');
  });

  /** "Margherita" twice at two prices is a bill nobody can check. */
  it('names the variant beside the dish', () => {
    render({
      ...MEAL,
      lines: [{ ...MEAL.lines[0], variantId: 'large', variantName: 'Large' }],
    });

    expect(text()).toContain('Margherita - Large');
  });

  /** Already priced into the unit (issue #1598), so small print under it. */
  it('lists the extras under the dish', () => {
    render({
      ...MEAL,
      lines: [
        {
          ...MEAL.lines[0],
          extras: [
            { extraId: 'e1', name: 'Extra cheese', price: 1 },
            { extraId: 'e2', name: 'Bacon', price: 2 },
          ],
        },
      ],
    });

    expect(text()).toContain('Extra cheese, Bacon');
  });

  it('says so when the table ordered nothing', () => {
    render({ ...MEAL, lines: [], total: 0 });

    expect(has('visit-summary-empty')).toBe(true);
    expect(has('visit-summary-total')).toBe(false);
  });

  /** `ADR-0004`. The wording is the contract, not decoration. */
  it('says it is not a receipt', () => {
    render(MEAL);

    expect(has('visit-summary-not-a-receipt')).toBe(true);
  });

  /**
   * Two copies of the sentence on one page read as a disclaimer somebody was
   * nervous about rather than as the plain fact it is.
   */
  it('lets a screen that already says so suppress it', () => {
    render(MEAL, false);

    expect(has('visit-summary-not-a-receipt')).toBe(false);
  });

  it('falls back to the currency code where no symbol is known', () => {
    render({ ...MEAL, currency: 'XYZ' });

    expect(text()).toContain('Total 24 XYZ');
  });
});
