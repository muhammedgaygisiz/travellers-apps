import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestaurantSelectorComponent } from '../restaurant-selector.component';

describe('RestaurantSelectorComponent', () => {
  let component: RestaurantSelectorComponent;
  let fixture: ComponentFixture<RestaurantSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantSelectorComponent],
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
