import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { RestaurantComponent } from '../restaurant.component';
import type { Bite, Geopoint, Restaurant } from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import type { getDistance } from '../../../../utils/get-distance';
import type { getPosition } from '../../../../utils/get-position';

jest.mock('leaflet');

const getDistanceMock = jest.fn<
  ReturnType<typeof getDistance>,
  Parameters<typeof getDistance>
>();
jest.mock('../../../../utils/get-distance', () => ({
  getDistance: (
    ...args: Parameters<typeof getDistance>
  ): ReturnType<typeof getDistance> => getDistanceMock(...args),
}));

const getPositionMock = jest.fn<
  ReturnType<typeof getPosition>,
  Parameters<typeof getPosition>
>();
jest.mock('../../../../utils/get-position', () => ({
  getPosition: (
    ...args: Parameters<typeof getPosition>
  ): ReturnType<typeof getPosition> => getPositionMock(...args),
}));

const uniqueBitesByNameMock = jest.fn<Bite[], [Bite[]]>();
jest.mock('../../../../utils/unique-bites-by-name', () => ({
  uniqueBitesByName: (bites: Bite[]): Bite[] => uniqueBitesByNameMock(bites),
}));

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const createBite = (overrides: Partial<Bite> = {}): Bite => ({
  id: 'bite-1',
  name: 'Bite',
  image: '',
  place: 'Bite Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
  ...overrides,
});

const createRestaurant = (overrides: Partial<Restaurant> = {}): Restaurant => ({
  id: 'restaurant-1',
  name: 'Restaurant',
  position: { latitude: 0, longitude: 0 },
  ...overrides,
});

describe('RestaurantComponent', () => {
  let component: RestaurantComponent;
  let fixture: ComponentFixture<RestaurantComponent>;
  let componentRef: ComponentRef<RestaurantComponent>;

  beforeEach(() => {
    getDistanceMock.mockReturnValue(undefined);
    getPositionMock.mockReturnValue(undefined);
    uniqueBitesByNameMock.mockReturnValue([]);

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(RestaurantComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('averageBiteRating', () => {
    it('should return average rating', () => {
      componentRef.setInput('bites', [
        createBite({ rating: 4 }),
        createBite({ rating: 5 }),
        createBite({ rating: 3 }),
      ]);
      expect(component.averageBiteRating()).toBe(4);
    });

    it('should return 0 if no bites', () => {
      componentRef.setInput('bites', []);
      expect(component.averageBiteRating()).toBe(0);
    });

    it('should return 0 if bites is undefined', () => {
      componentRef.setInput('bites', undefined);
      expect(component.averageBiteRating()).toBe(0);
    });

    it('should round if many decimals result from average', () => {
      componentRef.setInput('bites', [
        createBite({ rating: 4 }),
        createBite({ rating: 5.512312 }),
      ]);
      expect(component.averageBiteRating()).toBe(4.8);
    });

    it('should ignore bites without rating when calculating average', () => {
      componentRef.setInput('bites', [
        createBite({ rating: 4 }),
        createBite(),
        createBite({ rating: 2 }),
      ]);
      expect(component.averageBiteRating()).toBe(3);
      expect(component.ratedBiteCount()).toBe(2);
    });
  });

  describe('placeName', () => {
    beforeEach(() => {
      componentRef.setInput('bite', undefined);
      componentRef.setInput('restaurant', undefined);
    });
    it('should return restaurant name if available', () => {
      componentRef.setInput(
        'restaurant',
        createRestaurant({ id: '1', name: 'Test Restaurant' }),
      );
      expect(component.placeName()).toBe('Test Restaurant');
    });

    it('should return bite place if restaurant name not available', () => {
      componentRef.setInput('bite', createBite({ place: 'Bite Place' }));
      expect(component.placeName()).toBe('Bite Place');
    });

    it('should return empty string if no restaurant or bite', () => {
      expect(component.placeName()).toBe(undefined);
    });
  });

  describe('placeDistance', () => {
    it('should return distance from getDistance', () => {
      getDistanceMock.mockReturnValue('5 km');
      const restaurant = createRestaurant({
        id: '1',
        name: 'Test Restaurant',
      });
      const bite = createBite({ place: 'Bite Place' });
      componentRef.setInput('restaurant', restaurant);
      componentRef.setInput('bite', bite);
      expect(component.placeDistance()).toBe('5 km');
      expect(getDistanceMock).toHaveBeenCalledWith(restaurant, bite);
    });
  });

  describe('position', () => {
    it('should return position from getPosition', () => {
      const position: Geopoint = { latitude: 10, longitude: 20 };
      getPositionMock.mockReturnValue(position);
      const restaurant = createRestaurant({
        id: '1',
        name: 'Test Restaurant',
      });
      const bite = createBite({ place: 'Bite Place' });
      componentRef.setInput('restaurant', restaurant);
      componentRef.setInput('bite', bite);
      expect(component.position()).toEqual(position);
      expect(getPositionMock).toHaveBeenCalledWith(restaurant, bite);
    });
  });

  describe('uniqueBites', () => {
    it('should return unique bites based on id', () => {
      const bites = [
        createBite({ id: '1', name: 'Bite 1' }),
        createBite({ id: '2', name: 'Bite 2' }),
        createBite({ id: '1', name: 'Bite 1 Duplicate' }),
      ];
      const uniqueBites = [bites[0], bites[1]];
      uniqueBitesByNameMock.mockReturnValue(uniqueBites);
      componentRef.setInput('bites', bites);
      expect(component.uniqueBites()).toEqual(uniqueBites);
      expect(uniqueBitesByNameMock).toHaveBeenCalledWith(bites);
    });

    it('should return empty array if no bites', () => {
      uniqueBitesByNameMock.mockReturnValue([]);
      componentRef.setInput('bites', []);
      expect(component.uniqueBites()).toEqual([]);
      expect(uniqueBitesByNameMock).toHaveBeenCalledWith([]);
    });

    it('should return empty array if bites is undefined', () => {
      uniqueBitesByNameMock.mockReturnValue([]);
      componentRef.setInput('bites', undefined);
      expect(component.uniqueBites()).toEqual([]);
      expect(uniqueBitesByNameMock).toHaveBeenCalledWith([]);
    });
  });

  describe('setSelectedSegment', () => {
    it('should set the selected segment', () => {
      component.setSelectedSegment('menu');
      expect(component.selectedSegment()).toBe('menu');
      component.setSelectedSegment('bites');
      expect(component.selectedSegment()).toBe('bites');
    });

    it('should not set invalid segment', () => {
      component.setSelectedSegment('invalid');
      expect(component.selectedSegment()).toBe('bites'); // default value
    });
  });

  describe('uniqueTags', () => {
    it('should return unique tags from all bites', () => {
      componentRef.setInput('bites', [
        createBite({ tags: ['burger', 'spicy'] }),
        createBite({ tags: ['burger', 'vegan'] }),
        createBite({ tags: ['spicy'] }),
      ]);
      expect(component.uniqueTags()).toEqual(
        expect.arrayContaining(['burger', 'spicy', 'vegan']),
      );
      expect(component.uniqueTags()).toHaveLength(3);
    });

    it('should return empty array if no bites have tags', () => {
      componentRef.setInput('bites', [
        createBite({ name: 'Bite A' }),
        createBite({ name: 'Bite B' }),
      ]);
      expect(component.uniqueTags()).toEqual([]);
    });

    it('should return empty array if bites is undefined', () => {
      componentRef.setInput('bites', undefined);
      expect(component.uniqueTags()).toEqual([]);
    });

    it('should handle bites with undefined tags gracefully', () => {
      componentRef.setInput('bites', [
        createBite({ tags: ['sushi'] }),
        createBite({ tags: undefined }),
      ]);
      expect(component.uniqueTags()).toEqual(['sushi']);
    });

    it('should deduplicate tags across the hash prefix and case', () => {
      componentRef.setInput('bites', [
        createBite({ tags: ['Chinawok', 'cologne', 'asianfood'] }),
        createBite({ tags: ['#Chinawok', '#Cologne', '#asianfood'] }),
      ]);
      expect(component.uniqueTags()).toEqual([
        'Chinawok',
        'cologne',
        'asianfood',
      ]);
    });
  });

  describe('address display', () => {
    it('should render address when restaurant has address', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        address: {
          street: 'Main Street 1',
          postcode: '10115',
          city: 'Berlin',
          country: 'Germany',
        },
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      const nativeEl = fixture.nativeElement as HTMLElement;
      const text = nativeEl.textContent ?? '';
      expect(text).toContain('Main Street 1');
      expect(text).toContain('Berlin');
      expect(text).toContain('Germany');
    });

    it('should not render address section when restaurant has no address', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      const nativeEl = fixture.nativeElement as HTMLElement;
      const text = nativeEl.textContent ?? '';
      expect(text).not.toContain('Main Street');
    });
  });

  describe('loading state', () => {
    it('should render skeletons and no page content while the restaurant is missing', () => {
      componentRef.setInput('restaurant', undefined);
      componentRef.setInput('bites', [createBite({ rating: 4 })]);
      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(component.isLoading()).toBe(true);
      expect(
        nativeEl.querySelector('[data-testid="restaurant-loading"]'),
      ).toBeTruthy();
      expect(
        nativeEl.querySelector('[data-testid="restaurant-description-empty"]'),
      ).toBeNull();
      expect(
        nativeEl.querySelector('[data-testid="restaurant-social-links-empty"]'),
      ).toBeNull();
    });

    it('should not offer the menu or the bites button while the restaurant is missing', () => {
      componentRef.setInput('restaurant', undefined);
      uniqueBitesByNameMock.mockReturnValue([createBite()]);
      componentRef.setInput('bites', [createBite()]);
      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(
        nativeEl.querySelector('[data-testid="restaurant-menu-button"]'),
      ).toBeNull();
      expect(
        nativeEl.querySelector('[data-testid="restaurant-bites-button"]'),
      ).toBeNull();
    });

    it('should drop the skeletons once the restaurant resolves', () => {
      componentRef.setInput('restaurant', createRestaurant());
      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(component.isLoading()).toBe(false);
      expect(
        nativeEl.querySelector('[data-testid="restaurant-loading"]'),
      ).toBeNull();
    });
  });

  describe('menu button', () => {
    it('should render the menu button when the loaded restaurant has a menu id', () => {
      componentRef.setInput(
        'restaurant',
        createRestaurant({ menuId: '/menus/menu-1' }),
      );
      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(component.hasMenu()).toBe(true);
      expect(
        nativeEl.querySelector('[data-testid="restaurant-menu-button"]'),
      ).toBeTruthy();
    });

    it('should not render the menu button when the loaded restaurant has no menu id', () => {
      componentRef.setInput('restaurant', createRestaurant());
      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(component.hasMenu()).toBe(false);
      expect(
        nativeEl.querySelector('[data-testid="restaurant-menu-button"]'),
      ).toBeNull();
    });

    it('should emit the loaded restaurant when the menu button is clicked', () => {
      const restaurant = createRestaurant({ menuId: '/menus/menu-1' });
      componentRef.setInput('restaurant', restaurant);
      componentRef.changeDetectorRef.detectChanges();

      const emitted: (Restaurant | undefined)[] = [];
      component.showMenuClick.subscribe((value) => emitted.push(value));

      const nativeEl = fixture.nativeElement as HTMLElement;
      nativeEl
        .querySelector<HTMLElement>('[data-testid="restaurant-menu-button"]')
        ?.click();

      expect(emitted).toEqual([restaurant]);
    });
  });

  describe('empty restaurant details', () => {
    it('should render placeholder text when description and social media links are missing', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);

      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      expect(
        nativeEl.querySelector('[data-testid="restaurant-description-empty"]'),
      ).toBeTruthy();
      expect(
        nativeEl.querySelector('[data-testid="restaurant-social-links-empty"]'),
      ).toBeTruthy();
    });

    it('should render maintained description and social media links instead of placeholders', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        description: 'Fresh seasonal dishes.',
        socialMediaLinks: [
          { network: 'instagram', url: 'instagram.com/test-restaurant' },
        ],
      } as Restaurant);

      componentRef.changeDetectorRef.detectChanges();

      const nativeEl = fixture.nativeElement as HTMLElement;
      const text = nativeEl.textContent ?? '';
      expect(text).toContain('Fresh seasonal dishes.');
      expect(text).toContain('Instagram');
      expect(
        nativeEl.querySelector('[data-testid="restaurant-description-empty"]'),
      ).toBeNull();
      expect(
        nativeEl.querySelector('[data-testid="restaurant-social-links-empty"]'),
      ).toBeNull();
    });
  });
});
