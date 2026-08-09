import { ComponentFixture, ComponentRef, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { SearchbarInputEventDetail } from '@ionic/core';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { SearchPage } from '../search.page';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(SearchPage.name, () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;
  let componentRef: ComponentRef<SearchPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create with default input values', () => {
    expect(component).toBeTruthy();
    expect(component.results()).toEqual([]);
    expect(component.selectedCategory()).toBe('user');
    expect(component.isLoading()).toBe(false);
    expect(component.hasSearched()).toBe(false);
  });

  it('should run the header progress bar while a search is loading', () => {
    componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeTruthy();

    componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
    ).toBeFalsy();
  });

  describe('category selection', () => {
    it('should emit the selected category', () => {
      const emitSpy = jest.spyOn(component.categoryChange, 'emit');

      component.categoryValueChange('restaurant');

      expect(emitSpy).toHaveBeenCalledWith('restaurant');
    });

    it('should expose translated category options for the chip radio group', () => {
      expect(component.categoryOptions()).toEqual([
        { label: 'search-category-user', value: 'user' },
        { label: 'search-category-bite', value: 'bite' },
        { label: 'search-category-restaurant', value: 'restaurant' },
        { label: 'search-category-city', value: 'city' },
        { label: 'search-category-country', value: 'country' },
      ]);
    });
  });

  describe('country selection', () => {
    beforeEach(() => {
      componentRef.setInput('selectedCategory', 'country');
      fixture.detectChanges();
    });

    it('should replace the searchbar with the country field', () => {
      expect(fixture.nativeElement.querySelector('ion-searchbar')).toBeNull();
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="search-country-field"]',
        ),
      ).toBeTruthy();
    });

    it('should keep the searchbar for the text-driven categories', () => {
      componentRef.setInput('selectedCategory', 'city');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('ion-searchbar')).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="search-country-field"]',
        ),
      ).toBeNull();
    });

    it('should prompt for a country while none is picked', () => {
      // The prompt comes from the template pipe, not from the computed: a
      // translate() call inside the computed would cache the raw key when the
      // catalog is not loaded yet.
      expect(component.selectedCountryName()).toBe('');
      expect(component.selectedCountryFlagClass()).toBe('');
    });

    it('should show the localized name and flag of the picked country', () => {
      componentRef.setInput('selectedCountryCode', 'CH');
      fixture.detectChanges();

      expect(component.selectedCountryName()).toBe('Switzerland');
      expect(component.selectedCountryFlagClass()).toBe('fi fi-ch');
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="search-country-field"]',
        ).textContent,
      ).toContain('Switzerland');
    });

    it('should emit the picked country and close the picker', () => {
      const emitSpy = jest.spyOn(component.countryChange, 'emit');
      const modal = { dismiss: jest.fn() };

      component.countrySelected('CH', modal as never);

      expect(emitSpy).toHaveBeenCalledWith('CH');
      expect(modal.dismiss).toHaveBeenCalled();
    });

    it('should offer the map for country results', () => {
      expect(component.canShowMap()).toBe(true);
    });
  });

  describe('searchbarInput', () => {
    it('should emit the entered search text', () => {
      const emitSpy = jest.spyOn(component.searchTextChange, 'emit');

      component.searchbarInput({
        detail: { value: 'Alice' },
      } as CustomEvent<SearchbarInputEventDetail>);

      expect(emitSpy).toHaveBeenCalledWith('Alice');
    });

    it('should emit an empty string when the input has no value', () => {
      const emitSpy = jest.spyOn(component.searchTextChange, 'emit');

      component.searchbarInput({
        detail: { value: null },
      } as CustomEvent<SearchbarInputEventDetail>);

      expect(emitSpy).toHaveBeenCalledWith('');
    });
  });

  describe('map view', () => {
    it('should only offer a map for location-aware search categories', () => {
      expect(component.canShowMap()).toBe(false);

      componentRef.setInput('selectedCategory', 'bite');

      expect(component.canShowMap()).toBe(true);
    });

    it('should map positioned results to map markers', () => {
      componentRef.setInput('selectedCategory', 'bite');
      componentRef.setInput('results', [
        {
          category: 'bite',
          value: {
            id: 'bite-1',
            name: 'Butter Chicken',
            place: 'Tandoori House',
            position: { latitude: 46.948, longitude: 7.447 },
          },
        },
        {
          category: 'bite',
          value: {
            id: 'bite-2',
            name: 'No position',
            place: 'Tandoori House',
          },
        },
      ]);

      expect(component.mapPositions()).toEqual([
        { id: 'bite-bite-1', latitude: 46.948, longitude: 7.447 },
      ]);
    });

    it('should carry the rating into the marker so it matches other maps', () => {
      componentRef.setInput('selectedCategory', 'bite');
      componentRef.setInput('results', [
        {
          category: 'bite',
          value: {
            id: 'bite-1',
            name: 'Butter Chicken',
            place: 'Tandoori House',
            position: { latitude: 46.948, longitude: 7.447 },
            rating: 5,
          },
        },
      ]);

      expect(component.mapPositions()).toEqual([
        { id: 'bite-bite-1', latitude: 46.948, longitude: 7.447, rating: 5 },
      ]);
    });

    it('should leave an unrated bite without a rating rather than a zero', () => {
      componentRef.setInput('selectedCategory', 'bite');
      componentRef.setInput('results', [
        {
          category: 'bite',
          value: {
            id: 'bite-1',
            name: 'Butter Chicken',
            place: 'Tandoori House',
            position: { latitude: 46.948, longitude: 7.447 },
          },
        },
      ]);

      expect(component.mapPositions()[0]).not.toHaveProperty('rating');
    });

    it('should not put a rating on restaurant markers', () => {
      componentRef.setInput('selectedCategory', 'restaurant');
      componentRef.setInput('results', [
        {
          category: 'restaurant',
          value: {
            id: 'restaurant-1',
            name: 'Tandoori House',
            biteId: 'bite-1',
            position: { latitude: 46.948, longitude: 7.447 },
          },
        },
      ]);

      expect(component.mapPositions()[0]).not.toHaveProperty('rating');
    });

    it('should run the page full width only while the map is showing', () => {
      componentRef.setInput('selectedCategory', 'bite');
      expect(component.isMapView()).toBe(false);

      component.viewModeChange('map');
      expect(component.isMapView()).toBe(true);

      // A user category has no map, so the page keeps its reading column even
      // though the map toggle was left switched on.
      componentRef.setInput('selectedCategory', 'user');
      expect(component.isMapView()).toBe(false);
    });

    it('should emit the matching result when a map marker is selected', () => {
      const result = {
        category: 'restaurant' as const,
        value: {
          id: 'restaurant-1',
          name: 'Italian Restaurant Bern',
          biteId: 'bite-1',
          position: { latitude: 46.948, longitude: 7.447 },
        },
      };
      const emitSpy = jest.spyOn(component.resultClick, 'emit');
      componentRef.setInput('results', [result]);

      component.mapMarkerClick({
        id: 'restaurant-restaurant-1',
        latitude: 0,
        longitude: 0,
      });

      expect(emitSpy).toHaveBeenCalledWith(result);
    });

    it('should change between list and map views', () => {
      component.viewModeChange('map');
      expect(component.viewMode()).toBe('map');

      component.viewModeChange('unexpected');
      expect(component.viewMode()).toBe('map');
    });
  });
});
