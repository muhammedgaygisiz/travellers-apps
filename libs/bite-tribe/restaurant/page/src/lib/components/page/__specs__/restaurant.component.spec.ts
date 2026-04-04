import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { RestaurantComponent } from '../restaurant.component';
import { Link, Restaurant } from 'model';
import SpyInstance = jest.SpyInstance;

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

describe('RestaurantComponent', () => {
  let component: RestaurantComponent;
  let fixture: ComponentFixture<RestaurantComponent>;
  let componentRef: ComponentRef<RestaurantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(RestaurantComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('links', () => {
    it('should return empty array if no links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      expect(component.links.length).toBe(0);
    });
  });

  describe('initSocialMediaLinks', () => {
    it('should initialize social media links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
          { network: 'instagram', url: 'https://instagram.com/test' },
          { network: 'twitter', url: 'https://twitter.com/test' },
          { network: 'website', url: 'https://test.com' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.links.length).toBe(4);
    });

    it('should handle no social media links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.links.length).toBe(0);
    });
  });

  describe('isInvalid', () => {
    it('should be false if valid links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.isInvalid()).toBe(false);
    });

    it('should be true if invalid links', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [{ network: '', url: '' }] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.isInvalid()).toBe(true);
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

  describe('addSocialMedia', () => {
    it('should add a new social media link', () => {
      const initialLength = component.links.length;
      component.addSocialMedia();
      expect(component.links.length).toBe(initialLength + 1);
    });
  });

  describe('saveSocialMediaLinks', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.submitSocialMediaLinks, 'emit');
    });

    it('should emit save event if form is valid', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [
          { network: 'facebook', url: 'https://facebook.com/test' },
        ] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveSocialMediaLinks();
      expect(emitSpy).toHaveBeenCalledWith({
        links: [{ network: 'facebook', url: 'https://facebook.com/test' }],
      });
    });

    it('should not emit save event if form is invalid', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'Test Restaurant',
        socialMediaLinks: [{ network: '', url: '' }] as Link[],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      component.saveSocialMediaLinks();
      expect(emitSpy).not.toHaveBeenCalled();
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
});
