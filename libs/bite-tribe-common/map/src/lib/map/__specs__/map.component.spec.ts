import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MapComponent } from '../map.component';
import { Geopoint } from 'model';
import { DEFAULT_ZOOM } from '../model/default-zoom';

// Mock Leaflet
const mockMap = {
  setView: jest.fn(),
  getZoom: jest.fn().mockReturnValue(DEFAULT_ZOOM),
  fitBounds: jest.fn(),
  remove: jest.fn(),
  on: jest.fn(),
  removeLayer: jest.fn(),
  invalidateSize: jest.fn(),
};

jest.mock('leaflet', () => ({
  map: jest.fn(),
  tileLayer: jest.fn(),
  marker: jest.fn(),
  icon: jest.fn(),
  latLngBounds: jest.fn(),
  Marker: {
    prototype: {
      options: {},
    },
  },
}));

const zoomToGpsOrDefaultMock = jest.fn();
jest.mock('../utils/zoom-to-gps-or-default', () => ({
  zoomToGpsOrDefault: (...args: any): void => zoomToGpsOrDefaultMock(...args),
}));

const fitMapToMarkersMock = jest.fn();
jest.mock('../utils/fit-map-to-markers', () => ({
  fitMapToMarkers: (...args: any): void => fitMapToMarkersMock(...args),
}));

const geopointsToMarkersMock = jest.fn();
jest.mock('../utils/geopoints-to-markers', () => ({
  geopointsToMarkers: (...args: any): void => geopointsToMarkersMock(...args),
}));

const clearMarkersMock = jest.fn();
jest.mock('../utils/clear-markers', () => ({
  clearMarkers: (...args: any): void => clearMarkersMock(...args),
}));

const createMapMock = jest.fn();
jest.mock('../utils/create-map', () => ({
  createMap: (...args: any): void => createMapMock(...args),
}));

const createOpenstreetmapLayerMock = jest.fn();
jest.mock('../utils/create-openstreetmap-layer', () => ({
  createOpenstreetmapLayer: (...args: any): void =>
    createOpenstreetmapLayerMock(...args),
}));

const zoomToMarkersMock = jest.fn();
jest.mock('../utils/zoom-to-markers', () => ({
  zoomToMarkers: (...args: any): void => zoomToMarkersMock(...args),
}));

const zoomToGeopointMock = jest.fn();
jest.mock('../utils/zoom-to-geopoint', () => ({
  zoomToGeopoint: (...args: any): void => zoomToGeopointMock(...args),
}));

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let componentRef: ComponentRef<MapComponent>;

  const mockGeopoint: Geopoint = { latitude: 51.505, longitude: -0.09 };
  const mockMultipleGeopoints: Geopoint[] = [
    { latitude: 51.505, longitude: -0.09 },
    { latitude: 52.505, longitude: -1.09 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    createOpenstreetmapLayerMock.mockReturnValue({ addTo: jest.fn() });
    createMapMock.mockReturnValue(mockMap);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isReadonly', () => {
    it('should return true if readonly input is true', () => {
      componentRef.setInput('readonly', true);
      componentRef.setInput('geopoints', []);
      expect(component.isReadonly()).toBe(true);
    });

    it('should return true if more than one geopoint is provided', () => {
      componentRef.setInput('readonly', false);
      componentRef.setInput('geopoints', mockMultipleGeopoints);
      expect(component.isReadonly()).toBe(true);
    });

    it('should return false if readonly input is false and one or no geopoint is provided', () => {
      componentRef.setInput('readonly', false);
      componentRef.setInput('geopoints', [mockGeopoint]);
      expect(component.isReadonly()).toBe(false);

      componentRef.setInput('geopoints', []);
      expect(component.isReadonly()).toBe(false);
    });
  });

  describe('createMapEffect', () => {
    let mapDiv: any;

    beforeEach(() => {
      mapDiv = document.createElement('div');
      mapDiv.setAttribute('data-testid', 'map');
      fixture.nativeElement.appendChild(mapDiv);
      mockMap.on.mockClear();
    });

    it('should create map and add OSM layer on first render', () => {
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledTimes(1);
      expect(createOpenstreetmapLayerMock).toHaveBeenCalledTimes(1);
    });

    it('should not recreate map if it already exists', () => {
      fixture.detectChanges(); // First render
      fixture.detectChanges(); // Second render

      expect(createMapMock).toHaveBeenCalledTimes(2);
    });

    it('should update markers and zoom if geopoints are provided', () => {
      componentRef.setInput('geopoints', [mockGeopoint]);
      componentRef.setInput('gpsPosition', null);

      fixture.detectChanges();

      expect(geopointsToMarkersMock).toHaveBeenCalled();
      expect(zoomToMarkersMock).toHaveBeenCalled();
    });

    it('should call zoomToGpsOrDefault if no geopoints are provided', () => {
      componentRef.setInput('geopoints', []);
      componentRef.setInput('gpsPosition', mockGeopoint);

      fixture.detectChanges();

      expect(zoomToGpsOrDefaultMock).toHaveBeenCalled();
    });

    it('should add click event if not readonly', () => {
      componentRef.setInput('readonly', false);
      componentRef.setInput('geopoints', [mockGeopoint]);

      fixture.detectChanges();

      expect(mockMap.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should not add click event if readonly', () => {
      componentRef.setInput('readonly', true);
      componentRef.setInput('geopoints', [mockGeopoint]);

      fixture.detectChanges();

      expect(mockMap.on).not.toHaveBeenCalled();
    });
  });

  describe('setGeopointsEffect', () => {
    beforeEach(() => {
      fixture.detectChanges();
      jest.clearAllMocks();
      mockMap.remove.mockClear();
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should update markers and zoom when geopoints input changes', () => {
      componentRef.setInput('geopoints', [mockGeopoint]);

      fixture.detectChanges();

      expect(geopointsToMarkersMock).toHaveBeenCalled();
      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockGeopoint,
        expect.any(Object)
      );
    });

    it('should clear markers and reset view if geopoints is empty', () => {
      componentRef.setInput('geopoints', []);

      fixture.detectChanges();

      expect(clearMarkersMock).toHaveBeenCalled();
      expect(mockMap.setView).toHaveBeenCalledWith([0, 0], 2);
    });

    it('should handle undefined geopoints input', () => {
      componentRef.setInput('geopoints', undefined);

      fixture.detectChanges();

      expect(clearMarkersMock).toHaveBeenCalled();
      expect(mockMap.setView).toHaveBeenCalledWith([0, 0], 2);
    });

    it('should zoom to first geopoint if only one geopoint is provided', () => {
      componentRef.setInput('geopoints', [mockGeopoint]);

      fixture.detectChanges();

      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockGeopoint,
        expect.any(Object)
      );
      expect(fitMapToMarkersMock).not.toHaveBeenCalled();
    });

    it('should zoom to markers if multiple geopoints are provided', () => {
      componentRef.setInput('geopoints', mockMultipleGeopoints);
      componentRef.setInput('gpsPosition', null);

      fixture.detectChanges();
      jest.runAllTimers();

      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockMultipleGeopoints[0],
        expect.any(Object)
      );
      expect(fitMapToMarkersMock).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    beforeEach(() => {
      mockMap.remove.mockClear();
    });

    it('should remove map when map exists', () => {
      component['map'] = mockMap as any;

      component.ngOnDestroy();

      expect(mockMap.remove).toHaveBeenCalled();
    });

    it('should not throw error when map does not exist', () => {
      component['map'] = undefined as any;

      expect(() => component.ngOnDestroy()).not.toThrow();
      expect(mockMap.remove).not.toHaveBeenCalled();
    });
  });
});
