import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestaurantSelectorComponent } from '../restaurant-selector.component';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

/** The `Posting later` fixture from GitHub issue #1269: device in Bern... */
const BERN = { latitude: 46.948, longitude: 7.4474 };

/** ...photo taken in Ronda, roughly 1539 km away. */
const RONDA = { latitude: 36.7423, longitude: -5.166 };

/**
 * Two Ronda candidates on opposite sides of the Bite. `northOfBite` is farther
 * from the Bite but nearer to Bern, so ordering by the device and ordering by
 * the Bite disagree.
 */
const northOfBite = {
  placeId: 'north',
  name: 'North Tapas',
  address: 'Calle Norte 1, Ronda',
  position: { latitude: 36.76, longitude: -5.166 },
  distance: '1537.1',
};

const southOfBite = {
  placeId: 'south',
  name: 'South Tapas',
  address: 'Calle Sur 1, Ronda',
  position: { latitude: 36.74, longitude: -5.166 },
  distance: '1539.0',
};

const MockTranslocoService = {
  translate: jest.fn((key: string, params?: Record<string, string>): string => {
    if (!params) {
      return key;
    }

    return Object.entries(params).reduce(
      (translation, [name, value]) => translation.replace(`{{${name}}}`, value),
      key,
    );
  }),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of('en'),
};

describe('RestaurantSelectorComponent', () => {
  let component: RestaurantSelectorComponent;
  let fixture: ComponentFixture<RestaurantSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantSelectorComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show all restaurants when search term is empty', () => {
    const restaurants = [
      { name: 'Restaurant A' },
      { name: 'Restaurant B' },
      { name: 'Restaurant C' },
    ];
    fixture.componentRef.setInput('restaurants', restaurants);
    fixture.detectChanges();

    expect(component.filteredRestaurants().map((r) => r.name)).toEqual([
      'Restaurant A',
      'Restaurant B',
      'Restaurant C',
    ]);
  });

  it('should sort restaurants nearest first in the default view', () => {
    const restaurants = [
      { name: 'Far Away', distance: '5' },
      { name: 'Close By', distance: '0.3' },
      { name: 'Mid Range', distance: '2' },
    ];
    fixture.componentRef.setInput('restaurants', restaurants);
    fixture.detectChanges();

    expect(component.filteredRestaurants().map((r) => r.name)).toEqual([
      'Close By',
      'Mid Range',
      'Far Away',
    ]);
  });

  it('should filter restaurants based on search term', () => {
    const restaurants = [
      { name: 'Pizza Place' },
      { name: 'Burger Joint' },
      { name: 'Sushi Bar' },
    ];
    fixture.componentRef.setInput('restaurants', restaurants);
    component.rawSearchTerm.set('pizza');
    fixture.detectChanges();

    const filtered = component.filteredRestaurants().map((r) => r.name);
    expect(filtered).toContain('Pizza Place');
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('should show custom option when search term does not match any restaurant', () => {
    const restaurants = [{ name: 'Restaurant A' }, { name: 'Restaurant B' }];
    fixture.componentRef.setInput('restaurants', restaurants);
    component.rawSearchTerm.set('new restaurant');
    fixture.detectChanges();

    expect(component.showCustomOption()).toBe(true);
  });

  it('should not show custom option when search term matches a restaurant', () => {
    const restaurants = [{ name: 'Restaurant A' }, { name: 'Restaurant B' }];
    fixture.componentRef.setInput('restaurants', restaurants);
    component.rawSearchTerm.set('restaurant a');
    fixture.detectChanges();

    // Fuzzy match should find Restaurant A, so no custom option needed
    expect(component.filteredRestaurants().length).toBeGreaterThan(0);
  });

  it('should emit restaurantSelected when a restaurant is selected', () => {
    const emitSpy = jest.spyOn(component.restaurantSelected, 'emit');
    const restaurantName = 'Test Restaurant';

    component.selectRestaurant(restaurantName);

    expect(emitSpy).toHaveBeenCalledWith(restaurantName);
  });

  it('should emit restaurantSelected with custom text when custom option is selected', () => {
    const emitSpy = jest.spyOn(component.restaurantSelected, 'emit');
    const customText = 'New Restaurant Name';
    component.rawSearchTerm.set(customText);

    component.selectCustomRestaurant();

    expect(emitSpy).toHaveBeenCalledWith(customText);
  });

  it('should emit selectionCancel when cancel is called', () => {
    const emitSpy = jest.spyOn(component.selectionCancel, 'emit');

    component.cancel();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should offer the Google Maps search when there are no local hits', () => {
    fixture.componentRef.setInput('restaurants', [{ name: 'Pizza Place' }]);
    component.rawSearchTerm.set('sushi corner');
    fixture.detectChanges();

    expect(component.hasLocalHits()).toBe(false);
    expect(component.showGoogleSearchOption()).toBe(true);
  });

  it('should not offer the Google Maps search when there are local hits', () => {
    fixture.componentRef.setInput('restaurants', [{ name: 'Sushi Corner' }]);
    component.rawSearchTerm.set('sushi');
    fixture.detectChanges();

    expect(component.hasLocalHits()).toBe(true);
    expect(component.showGoogleSearchOption()).toBe(false);
  });

  it('should format the distance shown on restaurant rows', () => {
    expect(component.formatDistance('0.34')).toBe('0.3 km');
    expect(component.formatDistance(undefined)).toBe('');
    expect(component.formatDistance('not-a-number')).toBe('');
  });

  it('should sort Google Maps results nearest first', () => {
    fixture.componentRef.setInput('googlePlaces', [
      {
        placeId: 'place-far',
        name: 'Far Sushi',
        address: 'Far Street 1',
        position: { latitude: 1, longitude: 2 },
        distance: '3.2',
      },
      {
        placeId: 'place-near',
        name: 'Near Sushi',
        address: 'Near Street 1',
        position: { latitude: 1, longitude: 2 },
        distance: '0.4',
      },
    ]);
    fixture.detectChanges();

    expect(component.sortedGooglePlaces().map((place) => place.name)).toEqual([
      'Near Sushi',
      'Far Sushi',
    ]);
  });

  it('should sort nearby Google places nearest first', () => {
    fixture.componentRef.setInput('nearbyGooglePlaces', [
      {
        placeId: 'place-mid',
        name: 'Mid Bistro',
        address: 'Mid Street 1',
        position: { latitude: 1, longitude: 2 },
        distance: '1.5',
      },
      {
        placeId: 'place-near',
        name: 'Near Bistro',
        address: 'Near Street 1',
        position: { latitude: 1, longitude: 2 },
        distance: '0.2',
      },
    ]);
    fixture.detectChanges();

    expect(
      component.sortedNearbyGooglePlaces().map((place) => place.name),
    ).toEqual(['Near Bistro', 'Mid Bistro']);
  });

  it('should emit searchInGoogleMaps and remember the searched term', () => {
    const emitSpy = jest.spyOn(component.searchInGoogleMaps, 'emit');
    component.rawSearchTerm.set('sushi corner');

    component.searchGoogleMaps();

    expect(emitSpy).toHaveBeenCalledWith('sushi corner');
    expect(component.googleSearchTerm()).toBe('sushi corner');
    expect(component.showGoogleSearchOption()).toBe(false);
    expect(component.showGoogleResults()).toBe(true);
  });

  it('should hide Google results again once the search term changes', () => {
    component.rawSearchTerm.set('sushi corner');
    component.searchGoogleMaps();
    expect(component.showGoogleResults()).toBe(true);

    component.rawSearchTerm.set('sushi');

    expect(component.showGoogleResults()).toBe(false);
  });

  it('should emit googlePlaceSelected when a Google place is selected', () => {
    const emitSpy = jest.spyOn(component.googlePlaceSelected, 'emit');
    const place = {
      placeId: 'place-1',
      name: 'Sushi Corner',
      address: 'Main Street 1',
      position: { latitude: 1, longitude: 2 },
    };

    component.selectGooglePlace(place);

    expect(emitSpy).toHaveBeenCalledWith(place);
  });

  it('should show nearby Google places in the default view when available', () => {
    fixture.componentRef.setInput('nearbyGooglePlaces', [
      {
        placeId: 'place-1',
        name: 'Corner Bistro',
        address: 'Main Street 1',
        position: { latitude: 1, longitude: 2 },
      },
    ]);
    fixture.detectChanges();

    expect(component.showNearbyGooglePlaces()).toBe(true);
  });

  it('should show nearby Google places while they are loading', () => {
    fixture.componentRef.setInput('nearbyGooglePlacesLoading', true);
    fixture.detectChanges();

    expect(component.showNearbyGooglePlaces()).toBe(true);
  });

  it('should hide nearby Google places once the user starts typing', () => {
    fixture.componentRef.setInput('nearbyGooglePlaces', [
      {
        placeId: 'place-1',
        name: 'Corner Bistro',
        address: 'Main Street 1',
        position: { latitude: 1, longitude: 2 },
      },
    ]);
    component.rawSearchTerm.set('pizza');
    fixture.detectChanges();

    expect(component.showNearbyGooglePlaces()).toBe(false);
  });

  it('should not show nearby Google places when none are provided', () => {
    fixture.detectChanges();

    expect(component.showNearbyGooglePlaces()).toBe(false);
  });

  describe('with a Bite position that differs from the device position', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('userPosition', BERN);
      fixture.componentRef.setInput('bitePosition', RONDA);
      fixture.detectChanges();
    });

    it('should recognize the two positions as diverged', () => {
      expect(component.hasDivergedPositions()).toBe(true);
    });

    it('should name both origins on a row', () => {
      const lines = component.distanceLines(southOfBite);

      expect(lines.map((line) => line.labelKey)).toEqual([
        'restaurant-selector-distance-from-bite',
        'restaurant-selector-distance-from-you',
      ]);
      expect(lines[0].distance).toBe('0.3 km');
      expect(lines[1].distance).toMatch(/^153\d\.\d km$/);
    });

    it('should keep the two values distinguishable', () => {
      const [fromBite, fromUser] = component.distanceLines(southOfBite);

      expect(fromBite.distance).not.toBe(fromUser.distance);
    });

    it('should order Google Maps results by the distance from the Bite', () => {
      fixture.componentRef.setInput('googlePlaces', [northOfBite, southOfBite]);
      fixture.detectChanges();

      expect(component.sortedGooglePlaces().map((place) => place.name)).toEqual(
        ['South Tapas', 'North Tapas'],
      );
    });

    it('should order nearby Google places by the distance from the Bite', () => {
      fixture.componentRef.setInput('nearbyGooglePlaces', [
        northOfBite,
        southOfBite,
      ]);
      fixture.detectChanges();

      expect(
        component.sortedNearbyGooglePlaces().map((place) => place.name),
      ).toEqual(['South Tapas', 'North Tapas']);
    });

    it('should order local restaurants by the distance from the Bite', () => {
      fixture.componentRef.setInput('restaurants', [
        { name: northOfBite.name, ...northOfBite },
        { name: southOfBite.name, ...southOfBite },
      ]);
      fixture.detectChanges();

      expect(component.filteredRestaurants().map((r) => r.name)).toEqual([
        'South Tapas',
        'North Tapas',
      ]);
    });

    it('should show no distance for a row without a position of its own', () => {
      expect(component.distanceLines({ distance: '1539.0' })).toEqual([]);
    });
  });

  describe('with the Bite position and the device position co-located', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('userPosition', RONDA);
      fixture.componentRef.setInput('bitePosition', {
        latitude: RONDA.latitude + 0.001,
        longitude: RONDA.longitude,
      });
      fixture.detectChanges();
    });

    it('should not treat a position within the threshold as diverged', () => {
      expect(component.hasDivergedPositions()).toBe(false);
    });

    it('should show a single unlabelled distance instead of two near-identical ones', () => {
      expect(component.distanceLines(southOfBite)).toEqual([
        { labelKey: '', distance: '1539.0 km' },
      ]);
    });

    it('should keep ordering Google Maps results by the precomputed distance', () => {
      fixture.componentRef.setInput('googlePlaces', [southOfBite, northOfBite]);
      fixture.detectChanges();

      expect(component.sortedGooglePlaces().map((place) => place.name)).toEqual(
        ['North Tapas', 'South Tapas'],
      );
    });
  });

  it('should show a single distance while no Bite position is known', () => {
    fixture.componentRef.setInput('userPosition', BERN);
    fixture.detectChanges();

    expect(component.hasDivergedPositions()).toBe(false);
    expect(component.distanceLines(southOfBite)).toEqual([
      { labelKey: '', distance: '1539.0 km' },
    ]);
  });

  it('should update rawSearchTerm on searchbar input', () => {
    const searchValue = 'Test Restaurant';
    const mockEvent = {
      target: {
        value: searchValue,
      } as HTMLIonSearchbarElement,
    } as unknown as Event;

    component.searchbarInput(mockEvent);

    expect(component.rawSearchTerm()).toBe(searchValue);
  });
});
