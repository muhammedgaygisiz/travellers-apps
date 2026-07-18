import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { MapPageComponent } from '../map-page.component';
import type { Bite } from 'model';

addNecessaryIcons();

const createBite = (
  id: string,
  latitude: number,
  longitude: number,
  rating?: number,
): Bite => ({
  id,
  name: `Bite ${id}`,
  image: '',
  place: 'Test Place',
  price: 0,
  position: { latitude, longitude },
  rating,
});

describe('MapPageComponent', () => {
  let component: MapPageComponent;
  let fixture: ComponentFixture<MapPageComponent>;
  let componentRef: ComponentRef<MapPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });
    fixture = TestBed.createComponent(MapPageComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('positions', () => {
    it('should return undefined if bites is undefined', () => {
      componentRef.setInput('bites', undefined);
      expect(component.positions()).toBeUndefined();
    });

    it('should return empty array if bites is empty', () => {
      componentRef.setInput('bites', []);
      expect(component.positions()).toEqual([]);
    });

    it('should return array of positions if bites has positions', () => {
      const bites = [createBite('1', 1, 2), createBite('2', 3, 4)];
      componentRef.setInput('bites', bites);
      expect(component.positions()).toEqual([
        { id: '1', latitude: 1, longitude: 2 },
        { id: '2', latitude: 3, longitude: 4 },
      ]);
    });

    it('should include rating if bite has rating', () => {
      const bites = [
        createBite('1', 1, 2, 5),
        createBite('2', 3, 4, 0),
        createBite('3', 5, 6),
      ];
      componentRef.setInput('bites', bites);
      expect(component.positions()).toEqual([
        { id: '1', latitude: 1, longitude: 2, rating: 5 },
        { id: '2', latitude: 3, longitude: 4 },
        { id: '3', latitude: 5, longitude: 6 },
      ]);
    });

    it('should not include rating if bite has rating = 0', () => {
      const bites = [createBite('1', 1, 2, 0)];
      componentRef.setInput('bites', bites);
      expect(component.positions()).toEqual([
        { id: '1', latitude: 1, longitude: 2 },
      ]);
    });

    it('should not include rating if bite is missing rating', () => {
      const bites = [createBite('1', 1, 2)];
      componentRef.setInput('bites', bites);
      expect(component.positions()).toEqual([
        { id: '1', latitude: 1, longitude: 2 },
      ]);
    });
  });

  describe('onGeopointSelection', () => {
    const bites = [createBite('1', 1, 2), createBite('2', 3, 4)];

    it('should set selectedBite if bite with geopoint id is found', () => {
      componentRef.setInput('bites', bites);
      component.onGeopointSelection({ id: '1', latitude: 1, longitude: 2 });
      expect(component.selectedBite).toEqual(bites[0]);
    });

    it('should set selectedBite to undefined if bite with geopoint id is not found', () => {
      componentRef.setInput('bites', bites);
      component.onGeopointSelection({ id: '3', latitude: 5, longitude: 6 });
      expect(component.selectedBite).toBeUndefined();
    });

    it('should set selectedBite to undefined if bites is undefined', () => {
      componentRef.setInput('bites', undefined);
      component.onGeopointSelection({ id: '1', latitude: 1, longitude: 2 });
      expect(component.selectedBite).toBeUndefined();
    });

    it('should set selectedBite to undefined if bite is missing', () => {
      component.selectedBite = bites[0];
      component.onGeopointSelection(undefined);
      expect(component.selectedBite).toBeUndefined();
    });
  });
});
