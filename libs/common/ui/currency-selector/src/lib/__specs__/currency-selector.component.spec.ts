import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencySelectorComponent } from '../currency-selector.component';
import { addNecessaryIcons } from 'utils';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('CurrencySelectorComponent', () => {
  let component: CurrencySelectorComponent;
  let fixture: ComponentFixture<CurrencySelectorComponent>;

  beforeEach(() => {
    MockTranslocoService.getActiveLang.mockReturnValue('en');
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(CurrencySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('filteredCurrencies', () => {
    it('should display all currencies when no search term', () => {
      expect(component.filteredCurrencies().length).toBeGreaterThan(0);
    });

    it('should sort by similarity score', () => {
      component.rawSearchTerm.set('van le');
      const filtered = component.filteredCurrencies();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].code).toBe('MDL');
    });

    it('should search by localized currency name', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      fixture = TestBed.createComponent(CurrencySelectorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.rawSearchTerm.set('US-Dollar');
      const filtered = component.filteredCurrencies();

      expect(filtered[0].code).toBe('USD');
    });
  });

  it('should return the localized currency name', () => {
    MockTranslocoService.getActiveLang.mockReturnValue('de');
    fixture = TestBed.createComponent(CurrencySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const usd = component.currencies.find(
      (currency) => currency.code === 'USD',
    );

    expect(usd).toBeDefined();
    expect(component.getCurrencyName(usd ?? component.currencies[0])).toBe(
      'US-Dollar',
    );
  });

  it('should filter currencies based on search term', () => {
    component.rawSearchTerm.set('usd');
    const filtered = component.filteredCurrencies();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some((c) => c.code === 'USD')).toBeTruthy();
  });

  it('should emit currencySelected when currency is selected', () => {
    let selectedCode = '';
    component.currencySelected.subscribe((code) => {
      selectedCode = code;
    });

    component.selectCurrency('EUR');
    expect(selectedCode).toBe('EUR');
  });

  it('should place favorite currencies at the top', () => {
    fixture.componentRef.setInput('favoriteCurrencies', ['USD']);
    fixture.detectChanges();

    const filtered = component.filteredCurrencies();
    expect(filtered[0].code).toBe('USD');
  });

  it('should prioritize favorite currencies in searched results', () => {
    fixture.componentRef.setInput('favoriteCurrencies', ['USD']);
    fixture.detectChanges();
    component.rawSearchTerm.set('d');

    const filtered = component.filteredCurrencies();
    expect(filtered[0].code).toBe('USD');
  });

  it('should emit favoriteCurrencyToggled when favorite is toggled', () => {
    const stopPropagation = jest.fn();
    let toggledCode = '';

    component.favoriteCurrencyToggled.subscribe((code) => {
      toggledCode = code;
    });

    component.toggleFavorite(
      {
        stopPropagation,
      } as unknown as Event,
      'EUR',
    );

    expect(stopPropagation).toHaveBeenCalled();
    expect(toggledCode).toBe('EUR');
  });

  it('should emit selectionCancel when cancel is called', () => {
    let cancelled = false;
    component.selectionCancel.subscribe(() => {
      cancelled = true;
    });

    component.cancel();
    expect(cancelled).toBeTruthy();
  });

  describe('searchbarInput', () => {
    it('should update rawSearchTerm on input event', () => {
      const event = {
        target: { value: 'test' },
      } as unknown as Event;

      component.searchbarInput(event);
      expect(component.rawSearchTerm()).toBe('test');
    });
  });
});
