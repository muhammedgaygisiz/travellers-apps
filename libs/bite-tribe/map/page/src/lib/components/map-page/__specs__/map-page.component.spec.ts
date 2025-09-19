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
        { position: { lat: 1, lng: 2 } },
        { position: { lat: 3, lng: 4 } },
      ];
      componentRef.setInput('bites', bites);
      expect(component.positions()).toEqual([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ]);
    });
  });
});
