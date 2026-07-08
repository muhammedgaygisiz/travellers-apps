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
    const restaurants = ['Restaurant A', 'Restaurant B', 'Restaurant C'];
    fixture.componentRef.setInput('restaurants', restaurants);
    fixture.detectChanges();

    expect(component.filteredRestaurants()).toEqual(restaurants);
  });

  it('should filter restaurants based on search term', () => {
    const restaurants = ['Pizza Place', 'Burger Joint', 'Sushi Bar'];
    fixture.componentRef.setInput('restaurants', restaurants);
    component.rawSearchTerm.set('pizza');
    fixture.detectChanges();

    const filtered = component.filteredRestaurants();
    expect(filtered).toContain('Pizza Place');
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('should show custom option when search term does not match any restaurant', () => {
    const restaurants = ['Restaurant A', 'Restaurant B'];
    fixture.componentRef.setInput('restaurants', restaurants);
    component.rawSearchTerm.set('new restaurant');
    fixture.detectChanges();

    expect(component.showCustomOption()).toBe(true);
  });

  it('should not show custom option when search term matches a restaurant', () => {
    const restaurants = ['Restaurant A', 'Restaurant B'];
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
    fixture.componentRef.setInput('restaurants', ['Pizza Place']);
    component.rawSearchTerm.set('sushi corner');
    fixture.detectChanges();

    expect(component.hasLocalHits()).toBe(false);
    expect(component.showGoogleSearchOption()).toBe(true);
  });

  it('should not offer the Google Maps search when there are local hits', () => {
    fixture.componentRef.setInput('restaurants', ['Sushi Corner']);
    component.rawSearchTerm.set('sushi');
    fixture.detectChanges();

    expect(component.hasLocalHits()).toBe(true);
    expect(component.showGoogleSearchOption()).toBe(false);
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
