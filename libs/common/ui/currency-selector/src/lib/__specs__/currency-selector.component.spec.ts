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

  const rowFor = (code: string): HTMLElement => {
    const row = fixture.nativeElement.querySelector(
      `[data-testid="currency-option-${code}"]`,
    );

    if (!row) {
      throw new Error(`No row rendered for ${code}`);
    }

    return row;
  };

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

  it('should emit currencySelected when a row is tapped in preferred mode', () => {
    let selectedCode = '';
    let toggledCode = '';
    component.currencySelected.subscribe((code) => {
      selectedCode = code;
    });
    component.favoriteCurrencyToggled.subscribe((code) => {
      toggledCode = code;
    });

    component.selectRow('EUR');

    expect(selectedCode).toBe('EUR');
    expect(toggledCode).toBe('');
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

  describe('favorites mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'favorites');
      fixture.detectChanges();
    });

    it('should emit favoriteCurrencyToggled instead of currencySelected when a row is tapped', () => {
      let selectedCode = '';
      let toggledCode = '';
      component.currencySelected.subscribe((code) => {
        selectedCode = code;
      });
      component.favoriteCurrencyToggled.subscribe((code) => {
        toggledCode = code;
      });

      component.selectRow('EUR');

      expect(toggledCode).toBe('EUR');
      expect(selectedCode).toBe('');
    });

    it('should title and instruct for favorites', () => {
      expect(component.titleKey()).toBe('select-favorite-currencies');
      expect(component.instructionKey()).toBe(
        'favorite-currencies-instruction',
      );
      // The mock service renders piped copy as empty, so the rendered
      // instruction is asserted by its presence and its key.
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="currency-instruction"]',
        ),
      ).toBeTruthy();
    });

    it('should name the row by the action it performs and the state it is in', () => {
      fixture.componentRef.setInput('favoriteCurrencies', ['USD']);
      fixture.detectChanges();

      expect(rowFor('USD').getAttribute('aria-label')).toBe(
        'remove-currency-from-favorites',
      );
      expect(rowFor('EUR').getAttribute('aria-label')).toBe(
        'add-currency-to-favorites',
      );
    });

    it('should mark selected rows with a checked checkbox and unselected rows without', () => {
      fixture.componentRef.setInput('favoriteCurrencies', ['USD']);
      fixture.detectChanges();

      const favorite = rowFor('USD');
      const other = rowFor('EUR');

      expect(favorite.querySelector('ion-checkbox')?.checked).toBe(true);
      expect(other.querySelector('ion-checkbox')?.checked).toBe(false);
      expect(
        favorite.classList.contains('currency-selector__item--selected'),
      ).toBe(true);
      expect(
        other.classList.contains('currency-selector__item--selected'),
      ).toBe(false);
    });
  });

  describe('preferred mode', () => {
    it('should title and instruct for a single pick', () => {
      expect(component.titleKey()).toBe('select-currency');
      expect(component.instructionKey()).toBe('preferred-currency-instruction');
    });

    it('should mark the selected currency and label the rows accordingly', () => {
      fixture.componentRef.setInput('selectedCurrency', 'USD');
      fixture.detectChanges();

      const selected = rowFor('USD');
      const other = rowFor('EUR');

      expect(selected.getAttribute('aria-label')).toBe('currency-selected');
      expect(other.getAttribute('aria-label')).toBe('select-currency-option');
      expect(selected.querySelector('ion-icon')).toBeTruthy();
      expect(other.querySelector('ion-icon')).toBeFalsy();
    });

    it('should show favorites as a labelled note instead of a toggle', () => {
      fixture.componentRef.setInput('favoriteCurrencies', ['USD']);
      fixture.detectChanges();

      const favorite = rowFor('USD');

      expect(favorite.querySelector('ion-checkbox')).toBeFalsy();
      expect(favorite.querySelector('ion-note')).toBeTruthy();
      expect(rowFor('EUR').querySelector('ion-note')).toBeFalsy();
    });
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
