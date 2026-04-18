import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencySelectorComponent } from '../currency-selector.component';
import { addNecessaryIcons } from 'utils';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('CurrencySelectorComponent', () => {
  let component: CurrencySelectorComponent;
  let fixture: ComponentFixture<CurrencySelectorComponent>;

  beforeEach(() => {
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
