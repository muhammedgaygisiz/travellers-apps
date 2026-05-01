import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BitePlaceComponent } from '../bite-place.component';
import { Bite } from 'model';

jest.mock('leaflet');

const getDistanceMock = jest.fn();
jest.mock('../../../utils/get-distance', () => ({
  getDistance: (...args: unknown[]): void => getDistanceMock(...args),
}));

const getPositionMock = jest.fn();
jest.mock('../../../utils/get-position', () => ({
  getPosition: (...args: unknown[]): void => getPositionMock(...args),
}));

const uniqueBitesByNameMock = jest.fn();
jest.mock('../../../utils/unique-bites-by-name', () => ({
  uniqueBitesByName: (...args: unknown[]): void =>
    uniqueBitesByNameMock(...args),
}));

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BitePlaceComponent', () => {
  let component: BitePlaceComponent;
  let fixture: ComponentFixture<BitePlaceComponent>;
  let componentRef: ComponentRef<BitePlaceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(BitePlaceComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should only count rated bites and exclude 0/null/undefined ratings', () => {
    componentRef.setInput('bites', [
      { rating: 5 },
      { rating: 0 },
      { rating: null },
      { rating: undefined },
      { rating: 3 },
    ] as Bite[]);

    expect(component.ratedBiteCount()).toBe(2);
    expect(component.averageBiteRating()).toBe(4);
  });

  it('should keep total bites count independent from rated bites count', () => {
    componentRef.setInput('bites', [
      { rating: 0 },
      { rating: undefined },
    ] as Bite[]);

    expect(component.bitesCount()).toBe(2);
    expect(component.ratedBiteCount()).toBe(0);
    expect(component.averageBiteRating()).toBe(0);
  });

  it('should resolve place name from bite only', () => {
    componentRef.setInput('bite', { place: 'Only Bite Place' } as Bite);

    expect(component.placeName()).toBe('Only Bite Place');
  });

  it('should call distance and position utils with undefined restaurant and current bite', () => {
    const bite = { place: 'Bite Place' } as Bite;
    getDistanceMock.mockReturnValue('5 km');
    getPositionMock.mockReturnValue({ lat: 10, lng: 20 });
    componentRef.setInput('bite', bite);

    expect(component.placeDistance()).toBe('5 km');
    expect(component.position()).toEqual({ lat: 10, lng: 20 });
    expect(getDistanceMock).toHaveBeenCalledWith(undefined, bite);
    expect(getPositionMock).toHaveBeenCalledWith(undefined, bite);
  });

  it('should delegate unique bite extraction and sort by price', () => {
    const bites = [
      { name: 'A', price: 20 },
      { name: 'B', price: 10 },
    ] as Bite[];
    uniqueBitesByNameMock.mockReturnValue(bites);
    componentRef.setInput('bites', bites);

    expect(component.uniqueBites()).toEqual([
      { name: 'B', price: 10 },
      { name: 'A', price: 20 },
    ]);
    expect(uniqueBitesByNameMock).toHaveBeenCalledWith(bites);
  });

  describe('uniqueTags', () => {
    it('should return unique tags from all bites', () => {
      componentRef.setInput('bites', [
        { tags: ['vegan', 'spicy'] },
        { tags: ['spicy', 'sweet'] },
        { tags: ['vegan'] },
      ] as Bite[]);
      expect(component.uniqueTags()).toEqual(['vegan', 'spicy', 'sweet']);
    });

    it('should return empty array if no bites have tags', () => {
      componentRef.setInput('bites', [{ name: 'Bite A' }, { name: 'Bite B' }] as Bite[]);
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
      ] as Bite[]);
      expect(component.uniqueTags()).toEqual(['sushi']);
    });
  });
});
