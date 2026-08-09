import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { addNecessaryIcons, countries } from 'utils';
import { of } from 'rxjs';
import { CountrySelectorComponent } from '../country-selector.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('CountrySelectorComponent', () => {
  let component: CountrySelectorComponent;
  let fixture: ComponentFixture<CountrySelectorComponent>;

  const createComponent = (): void => {
    fixture = TestBed.createComponent(CountrySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const rowFor = (code: string): HTMLElement => {
    const row = fixture.nativeElement.querySelector(
      `[data-testid="country-option-${code}"]`,
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
    createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('filteredCountries', () => {
    it('should offer every country when no search term is entered', () => {
      expect(component.filteredCountries()).toHaveLength(countries.length);
    });

    it('should list countries alphabetically by localized name', () => {
      const [first] = component.filteredCountries();

      expect(first.code).toBe('AF');
    });

    it('should match on the localized name', () => {
      component.rawSearchTerm.set('switzerland');

      expect(component.filteredCountries()[0].code).toBe('CH');
    });

    it('should match on the alpha-2 code', () => {
      component.rawSearchTerm.set('ch');

      expect(
        component.filteredCountries().some((country) => country.code === 'CH'),
      ).toBe(true);
    });

    it('should tolerate a typo in the name', () => {
      component.rawSearchTerm.set('germny');

      expect(component.filteredCountries()[0].code).toBe('DE');
    });

    it('should find nothing for a term that matches no country', () => {
      component.rawSearchTerm.set('zzzzzzzz');

      expect(component.filteredCountries()).toEqual([]);
    });
  });

  describe('localization', () => {
    it('should search and sort in the active language', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      createComponent();

      component.rawSearchTerm.set('Schweiz');

      expect(component.filteredCountries()[0].code).toBe('CH');
    });

    it('should render the localized name in the row', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      createComponent();

      expect(rowFor('CH').textContent).toContain('Schweiz');
    });
  });

  describe('selection', () => {
    it('should emit the selected country code', () => {
      const countrySelected = jest.fn();
      component.countrySelected.subscribe(countrySelected);

      rowFor('CH').click();

      expect(countrySelected).toHaveBeenCalledWith('CH');
    });

    it('should emit on cancel', () => {
      const selectionCancel = jest.fn();
      component.selectionCancel.subscribe(selectionCancel);

      component.cancel();

      expect(selectionCancel).toHaveBeenCalled();
    });

    it('should mark the selected country', () => {
      fixture.componentRef.setInput('selectedCountry', 'CH');
      fixture.detectChanges();

      expect(rowFor('CH').className).toContain(
        'country-selector__item--selected',
      );
    });

    it('should announce whether the row is the current selection', () => {
      fixture.componentRef.setInput('selectedCountry', 'CH');
      fixture.detectChanges();

      expect(MockTranslocoService.translate).toHaveBeenCalledWith(
        'country-selected',
        { country: 'Switzerland' },
      );
      expect(MockTranslocoService.translate).toHaveBeenCalledWith(
        'select-country-option',
        { country: 'Germany' },
      );
    });
  });

  describe('flags', () => {
    it('should map the country code to a flag-icons class', () => {
      expect(component.getFlagClass({ code: 'CH', name: 'Switzerland' })).toBe(
        'fi fi-ch',
      );
    });
  });

  describe('searchbar input', () => {
    const searchbar = (): HTMLIonSearchbarElement =>
      fixture.nativeElement.querySelector('ion-searchbar');

    it('should filter from what the user types, case-insensitively', () => {
      const bar = searchbar();
      bar.value = 'SWITZERLAND';
      bar.dispatchEvent(new CustomEvent('ionInput'));
      fixture.detectChanges();

      expect(component.rawSearchTerm()).toBe('switzerland');
      expect(component.filteredCountries()[0].code).toBe('CH');
    });

    it('should fall back to an empty term when the searchbar is cleared', () => {
      component.rawSearchTerm.set('switzerland');

      const bar = searchbar();
      bar.value = null;
      bar.dispatchEvent(new CustomEvent('ionInput'));
      fixture.detectChanges();

      expect(component.rawSearchTerm()).toBe('');
      expect(component.filteredCountries()).toHaveLength(countries.length);
    });

    it('should render the empty state instead of rows when nothing matches', () => {
      component.rawSearchTerm.set('zzzzzzzz');
      fixture.detectChanges();

      // The mocked Transloco service makes the pipe emit an empty string, so
      // the empty row is asserted structurally rather than by its copy.
      expect(
        fixture.nativeElement.querySelectorAll(
          '[data-testid^="country-option-"]',
        ),
      ).toHaveLength(0);
      expect(fixture.nativeElement.querySelectorAll('ion-item')).toHaveLength(
        1,
      );
    });
  });

  describe('active language fallback', () => {
    it('should fall back to English when no active language is reported', () => {
      MockTranslocoService.getActiveLang.mockReturnValue(
        undefined as unknown as string,
      );
      createComponent();

      expect(component.activeLang()).toBe('en');
      expect(
        component.getCountryName({ code: 'CH', name: 'Switzerland' }),
      ).toBe('Switzerland');
    });
  });
});
