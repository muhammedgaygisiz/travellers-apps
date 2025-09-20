import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { MapPageComponent } from '../map-page.component';

addNecessaryIcons();

jest.mock('localization');

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
      const bites = [
        { id: '1', position: { lat: 1, lng: 2 } },
        { id: '2', position: { lat: 3, lng: 4 } },
      ];
      componentRef.setInput('bites', bites);
      expect(component.positions()).toEqual([
        { id: '1', lat: 1, lng: 2 },
        { id: '2', lat: 3, lng: 4 },
      ]);
    });
  });

  describe('onGeopointSelection', () => {
    it('should set selectedBite if bite with geopoint id is found', () => {
      const bites = [
        { id: '1', position: { lat: 1, lng: 2 } },
        { id: '2', position: { lat: 3, lng: 4 } },
      ];
      componentRef.setInput('bites', bites);
      component.onGeopointSelection({ id: '1', latitude: 1, longitude: 2 });
      expect(component.selectedBite).toEqual(bites[0]);
    });

    it('should set selectedBite to undefined if bite with geopoint id is not found', () => {
      const bites = [
        { id: '1', position: { lat: 1, lng: 2 } },
        { id: '2', position: { lat: 3, lng: 4 } },
      ];
      componentRef.setInput('bites', bites);
      component.onGeopointSelection({ id: '3', latitude: 5, longitude: 6 });
      expect(component.selectedBite).toBeUndefined();
    });

    it('should set selectedBite to undefined if bites is undefined', () => {
      componentRef.setInput('bites', undefined);
      component.onGeopointSelection({ id: '1', latitude: 1, longitude: 2 });
      expect(component.selectedBite).toBeUndefined();
    });
  });
});
