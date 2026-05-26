import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { RestaurantComponent } from '../restaurant.component';
import { Restaurant } from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('leaflet');

const getDistanceMock = jest.fn();
jest.mock('../../../utils/get-distance', () => ({
  getDistance: (...args: any): void => getDistanceMock(...args),
}));

const getPositionMock = jest.fn();
jest.mock('../../../utils/get-position', () => ({
  getPosition: (...args: any): void => getPositionMock(...args),
}));

const uniqueBitesByNameMock = jest.fn();
jest.mock('../../../utils/unique-bites-by-name', () => ({
  uniqueBitesByName: (...args: any): void => uniqueBitesByNameMock(...args),
}));

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('RestaurantComponent', () => {
  let component: RestaurantComponent;
  let fixture: ComponentFixture<RestaurantComponent>;
  let componentRef: ComponentRef<RestaurantComponent>;

  beforeEach(() => {
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
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
      ] as any);
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
        { rating: 4 },
        { rating: 5.512312 },
      ] as any);
      expect(component.averageBiteRating()).toBe(4.8);
    });

    it('should ignore bites without rating when calculating average', () => {
      componentRef.setInput('bites', [{ rating: 4 }, {}, { rating: 2 }] as any);
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
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.placeName()).toBe('Test Restaurant');
    });

    it('should return bite place if restaurant name not available', () => {
      componentRef.setInput('bite', { place: 'Bite Place' });
      expect(component.placeName()).toBe('Bite Place');
    });

    it('should return empty string if no restaurant or bite', () => {
      expect(component.placeName()).toBe(undefined);
    });
  });

  describe('placeDistance', () => {
    it('should return distance from getDistance', () => {
      getDistanceMock.mockReturnValue('5 km');
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.setInput('bite', { place: 'Bite Place' });
      expect(component.placeDistance()).toBe('5 km');
      expect(getDistanceMock).toHaveBeenCalledWith(
        { id: '1', name: 'Test Restaurant' },
        { place: 'Bite Place' },
      );
    });
  });

  describe('position', () => {
    it('should return position from getPosition', () => {
      getPositionMock.mockReturnValue({ lat: 10, lng: 20 });
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.setInput('bite', { place: 'Bite Place' });
      expect(component.position()).toEqual({ lat: 10, lng: 20 });
      expect(getPositionMock).toHaveBeenCalledWith(
        { id: '1', name: 'Test Restaurant' },
        { place: 'Bite Place' },
      );
    });
  });

  describe('uniqueBites', () => {
    it('should return unique bites based on id', () => {
      const bites = [
        { id: '1', name: 'Bite 1' },
        { id: '2', name: 'Bite 2' },
        { id: '1', name: 'Bite 1 Duplicate' },
      ];
      uniqueBitesByNameMock.mockReturnValue([
        { id: '1', name: 'Bite 1' },
        { id: '2', name: 'Bite 2' },
      ]);
      componentRef.setInput('bites', bites);
      expect(component.uniqueBites()).toEqual([
        { id: '1', name: 'Bite 1' },
        { id: '2', name: 'Bite 2' },
      ]);
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
      component.setSelectedSegment('invalid' as any);
      expect(component.selectedSegment()).toBe('bites'); // default value
    });
  });

  describe('uniqueTags', () => {
    it('should return unique tags from all bites', () => {
      componentRef.setInput('bites', [
        { tags: ['burger', 'spicy'] },
        { tags: ['burger', 'vegan'] },
        { tags: ['spicy'] },
      ] as any);
      expect(component.uniqueTags()).toEqual(
        expect.arrayContaining(['burger', 'spicy', 'vegan']),
      );
      expect(component.uniqueTags()).toHaveLength(3);
    });

    it('should return empty array if no bites have tags', () => {
      componentRef.setInput('bites', [
        { name: 'Bite A' },
        { name: 'Bite B' },
      ] as any);
      expect(component.uniqueTags()).toEqual([]);
    });

    it('should return empty array if bites is undefined', () => {
      componentRef.setInput('bites', undefined);
      expect(component.uniqueTags()).toEqual([]);
    });

    it('should handle bites with undefined tags gracefully', () => {
      componentRef.setInput('bites', [
        { tags: ['sushi'] },
        { tags: undefined },
      ] as any);
      expect(component.uniqueTags()).toEqual(['sushi']);
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
});
