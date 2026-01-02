import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MapComponent } from '../map.component';
import { Geopoint } from 'model';
import { DEFAULT_ZOOM } from '../model/default-zoom';
import { Mock, vi } from 'vitest';

const mockMap = {
  setView: vi.fn(),
  getZoom: vi.fn().mockReturnValue(DEFAULT_ZOOM),
  fitBounds: vi.fn(),
  remove: vi.fn(),
  on: vi.fn(),
  removeLayer: vi.fn(),
  invalidateSize: vi.fn(),
};

vi.mock('leaflet', () => ({
  map: vi.fn(),
  tileLayer: vi.fn(),
  marker: vi.fn(),
  icon: vi.fn(),
  latLngBounds: vi.fn(),
  Marker: {
    prototype: {
      options: {},
    },
  },
}));

const zoomToGpsOrDefaultMock = vi.fn();
vi.mock('../utils/zoom-to-gps-or-default', () => ({
  zoomToGpsOrDefault: (...args: any): void => zoomToGpsOrDefaultMock(...args),
}));

const fitMapToMarkersMock = vi.fn();
vi.mock('../utils/fit-map-to-markers', () => ({
  fitMapToMarkers: (...args: any): void => fitMapToMarkersMock(...args),
}));

const geopointsToMarkersMock = vi.fn();
vi.mock('../utils/geopoints-to-markers', () => ({
  geopointsToMarkers: (...args: any): void => geopointsToMarkersMock(...args),
}));

const clearMarkersMock = vi.fn();
vi.mock('../utils/clear-markers', () => ({
  clearMarkers: (...args: any): void => clearMarkersMock(...args),
}));

const createMapMock = vi.fn();
vi.mock('../utils/create-map', () => ({
  createMap: (...args: any): void => createMapMock(...args),
}));

const createOpenstreetmapLayerMock = vi.fn();
vi.mock('../utils/create-openstreetmap-layer', () => ({
  createOpenstreetmapLayer: (...args: any): void =>
    createOpenstreetmapLayerMock(...args),
}));

const zoomToMarkersMock = vi.fn();
vi.mock('../utils/zoom-to-markers', () => ({
  zoomToMarkers: (...args: any): void => zoomToMarkersMock(...args),
}));

const zoomToGeopointMock = vi.fn();
vi.mock('../utils/zoom-to-geopoint', () => ({
  zoomToGeopoint: (...args: any): void => zoomToGeopointMock(...args),
}));

const focusMarkerMock = vi.fn();
vi.mock('../utils/focus-marker', () => ({
  focusMarker: (...args: any): void => focusMarkerMock(...args),
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

    createOpenstreetmapLayerMock.mockReturnValue({ addTo: vi.fn() });
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

  describe('enableZoom', () => {
    let mapDiv: any;

    beforeEach(() => {
      mapDiv = document.createElement('div');
      mapDiv.setAttribute('data-testid', 'map');
      fixture.nativeElement.appendChild(mapDiv);
      createMapMock.mockClear();
    });

    it('should pass enableZoom as true to createMap by default', () => {
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledWith(expect.any(Object), true);
    });

    it('should pass enableZoom as true when explicitly set to true', () => {
      componentRef.setInput('enableZoom', true);
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledWith(expect.any(Object), true);
    });

    it('should pass enableZoom as false when set to false', () => {
      componentRef.setInput('enableZoom', false);
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledWith(expect.any(Object), false);
    });
  });

  describe('createMapEffect', () => {
    let mapDiv: any;
    let emitMarkerClickSpy: Mock;

    beforeEach(() => {
      mapDiv = document.createElement('div');
      mapDiv.setAttribute('data-testid', 'map');
      fixture.nativeElement.appendChild(mapDiv);
      mockMap.on.mockClear();
      createMapMock.mockClear();
      createOpenstreetmapLayerMock.mockClear();
      emitMarkerClickSpy = vi
        .spyOn(component.clickOnMarker, 'emit')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should create map and add OSM layer on first render', () => {
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledTimes(1);
      expect(createOpenstreetmapLayerMock).toHaveBeenCalledTimes(1);
    });

    it('should not recreate map if it already exists', () => {
      fixture.detectChanges(); // First render
      fixture.detectChanges(); // Second render

      expect(createMapMock).toHaveBeenCalledTimes(1);
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

    describe('addMapClickEvent via createMapEffect', () => {
      let mapDiv: any;
      let mockClickEvent: any;
      let emitClickOnMapSpy: Mock;
      let emitClickOnMarkerSpy: Mock;

      beforeEach(() => {
        mapDiv = document.createElement('div');
        mapDiv.setAttribute('data-testid', 'map');
        fixture.nativeElement.appendChild(mapDiv);

        mockClickEvent = {
          latlng: {
            lat: 51.505,
            lng: -0.09,
          },
        };

        emitClickOnMapSpy = vi
          .spyOn(component.clickOnMap, 'emit')
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .mockImplementation(() => {});
        emitClickOnMarkerSpy = vi
          .spyOn(component.clickOnMarker, 'emit')
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .mockImplementation(() => {});

        mockMap.on.mockClear();
        focusMarkerMock.mockClear();
        geopointsToMarkersMock.mockClear();
      });

      it('should add click event listener to map', () => {
        fixture.detectChanges();

        expect(mockMap.on).toHaveBeenCalledWith('click', expect.any(Function));
      });

      it('should emit clickOnMarker with undefined when map is clicked', () => {
        fixture.detectChanges();

        const clickHandler = mockMap.on.mock.calls[0][1];
        clickHandler(mockClickEvent);

        expect(emitClickOnMarkerSpy).toHaveBeenCalledWith(undefined);
        expect(focusMarkerMock).toHaveBeenCalledWith(
          undefined,
          [],
          expect.any(Object),
        );
      });

      it('should emit clickOnMap and update markers when not readonly', () => {
        componentRef.setInput('readonly', false);
        componentRef.setInput('geopoints', []);
        fixture.detectChanges();

        const clickHandler = mockMap.on.mock.calls[0][1];
        clickHandler(mockClickEvent);

        const expectedPosition = {
          latitude: 51.505,
          longitude: -0.09,
        };

        expect(emitClickOnMapSpy).toHaveBeenCalledWith(expectedPosition);
        expect(geopointsToMarkersMock).toHaveBeenCalledWith(
          [expectedPosition],
          expect.any(Object),
        );
      });

      it('should not emit clickOnMap when readonly', () => {
        componentRef.setInput('readonly', true);
        fixture.detectChanges();

        const clickHandler = mockMap.on.mock.calls[0][1];
        clickHandler(mockClickEvent);

        expect(emitClickOnMapSpy).not.toHaveBeenCalled();
        expect(geopointsToMarkersMock).not.toHaveBeenCalled();
      });

      it('should convert click coordinates to geopoint correctly', () => {
        const customClickEvent = {
          latlng: {
            lat: 40.7128,
            lng: -74.006,
          },
        };

        componentRef.setInput('readonly', false);
        componentRef.setInput('geopoints', []);
        fixture.detectChanges();

        const clickHandler = mockMap.on.mock.calls[0][1];
        clickHandler(customClickEvent);

        const expectedPosition = {
          latitude: 40.7128,
          longitude: -74.006,
        };

        expect(emitClickOnMapSpy).toHaveBeenCalledWith(expectedPosition);
        expect(geopointsToMarkersMock).toHaveBeenCalledWith(
          [expectedPosition],
          expect.any(Object),
        );
      });

      it('should clear existing markers when map is clicked and not readonly', () => {
        const existingMarkers = [{ id: 'existing' }];
        component['markers'] = existingMarkers as any;

        componentRef.setInput('readonly', false);
        componentRef.setInput('geopoints', []);
        fixture.detectChanges();

        const clickHandler = mockMap.on.mock.calls[0][1];
        clickHandler(mockClickEvent);

        expect(clearMarkersMock).toHaveBeenCalledWith(
          existingMarkers,
          expect.any(Object),
        );
      });
    });

    describe('addMarkerClickEvent via createMapEffect', () => {
      let mapDiv: any;
      let mockMarker1: any;
      let mockMarker2: any;

      beforeEach(() => {
        mapDiv = document.createElement('div');
        mapDiv.setAttribute('data-testid', 'map');
        fixture.nativeElement.appendChild(mapDiv);

        mockMarker1 = {
          on: vi.fn(),
          options: { title: 'marker1' },
        };
        mockMarker2 = {
          on: vi.fn(),
          options: { title: 'marker2' },
        };

        emitMarkerClickSpy = vi
          .spyOn(component.clickOnMarker, 'emit')
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .mockImplementation(() => {});

        geopointsToMarkersMock.mockImplementation(() => {
          component['markers'] = [mockMarker1, mockMarker2];
          return [mockMarker1, mockMarker2];
        });

        mockMap.on.mockClear();
        focusMarkerMock.mockClear();
      });

      it('should add click events to markers when emitMarkerClick is true', () => {
        const geopoints = [
          { id: 'marker1', latitude: 51.505, longitude: -0.09 },
          { id: 'marker2', latitude: 52.505, longitude: -1.09 },
        ];

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        fixture.detectChanges();

        expect(mockMarker1.on).toHaveBeenCalledWith(
          'click',
          expect.any(Function),
        );
        expect(mockMarker2.on).toHaveBeenCalledWith(
          'click',
          expect.any(Function),
        );
      });

      it('should not add click events to markers when emitMarkerClick is false', () => {
        const geopoints = [
          { id: 'marker1', latitude: 51.505, longitude: -0.09 },
          { id: 'marker2', latitude: 52.505, longitude: -1.09 },
        ];

        componentRef.setInput('emitMarkerClick', false);
        componentRef.setInput('geopoints', geopoints);
        fixture.detectChanges();

        expect(mockMarker1.on).not.toHaveBeenCalled();
        expect(mockMarker2.on).not.toHaveBeenCalled();
        expect(focusMarkerMock).not.toHaveBeenCalled();
      });

      it('should emit clickOnMarker when marker is clicked and geopoint is found', () => {
        const geopoints = [
          { id: 'marker1', latitude: 51.505, longitude: -0.09 },
          { id: 'marker2', latitude: 52.505, longitude: -1.09 },
        ];

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        fixture.detectChanges();

        const clickHandler = mockMarker1.on.mock.calls[0][1];
        clickHandler();

        expect(emitMarkerClickSpy).toHaveBeenCalledWith({
          id: 'marker1',
          latitude: 51.505,
          longitude: -0.09,
        });
        expect(focusMarkerMock).toHaveBeenCalledTimes(1);
      });

      it('should not emit clickOnMarker when geopoint is not found', () => {
        const geopoints = [
          { id: 'marker1', latitude: 51.505, longitude: -0.09 },
        ];

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        fixture.detectChanges();

        const clickHandler = mockMarker2.on.mock.calls[0][1];
        clickHandler();

        expect(emitMarkerClickSpy).not.toHaveBeenCalled();
        expect(focusMarkerMock).not.toHaveBeenCalled();
      });

      it('should not emit clickOnMarker when geopoints is undefined', () => {
        const geopoints = undefined as any;

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        component['markers'] = [mockMarker2];
        fixture.detectChanges();

        const clickHandler = mockMarker2.on.mock.calls[0][1];
        clickHandler();

        expect(emitMarkerClickSpy).not.toHaveBeenCalled();
        expect(focusMarkerMock).not.toHaveBeenCalled();
      });

      it('should only add click events to markers with titles', () => {
        const mockMarkerWithoutTitle = {
          on: vi.fn(),
          options: {},
        };

        geopointsToMarkersMock.mockImplementation(() => {
          component['markers'] = [mockMarker1, mockMarkerWithoutTitle];
          return [mockMarker1, mockMarkerWithoutTitle];
        });

        const geopoints = [
          { id: 'marker1', latitude: 51.505, longitude: -0.09 },
        ];

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        fixture.detectChanges();

        expect(mockMarker1.on).toHaveBeenCalledWith(
          'click',
          expect.any(Function),
        );
        expect(mockMarkerWithoutTitle.on).not.toHaveBeenCalled();
        expect(focusMarkerMock).not.toHaveBeenCalled();
      });

      it('should handle multiple marker clicks correctly', () => {
        const geopoints = [
          { id: 'marker1', latitude: 51.505, longitude: -0.09 },
          { id: 'marker2', latitude: 52.505, longitude: -1.09 },
        ];

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        fixture.detectChanges();

        // Click marker1
        const clickHandler1 = mockMarker1.on.mock.calls[0][1];
        clickHandler1();

        expect(emitMarkerClickSpy).toHaveBeenCalledWith(geopoints[0]);

        // Click marker2
        const clickHandler2 = mockMarker2.on.mock.calls[0][1];
        clickHandler2();

        expect(emitMarkerClickSpy).toHaveBeenCalledWith(geopoints[1]);
        expect(emitMarkerClickSpy).toHaveBeenCalledTimes(2);
        expect(focusMarkerMock).toHaveBeenCalledTimes(2);
      });

      it('should handle empty geopoints array when marker is clicked', () => {
        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', []);
        fixture.detectChanges();

        // Manually trigger marker click since no markers would be created
        geopointsToMarkersMock.mockImplementation(() => {
          component['markers'] = [mockMarker1];
          return [mockMarker1];
        });

        // Trigger createMapEffect again with markers but empty geopoints
        componentRef.setInput('geopoints', []);
        fixture.detectChanges();

        if (mockMarker1.on.mock.calls.length > 0) {
          const clickHandler = mockMarker1.on.mock.calls[0][1];
          clickHandler();

          expect(emitMarkerClickSpy).not.toHaveBeenCalled();
          expect(focusMarkerMock).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('setGeopointsEffect', () => {
    beforeEach(() => {
      fixture.detectChanges();
      vi.clearAllMocks();
      mockMap.remove.mockClear();
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should update markers and zoom when geopoints input changes', () => {
      componentRef.setInput('geopoints', [mockGeopoint]);

      fixture.detectChanges();

      expect(geopointsToMarkersMock).toHaveBeenCalled();
      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockGeopoint,
        expect.any(Object),
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
        expect.any(Object),
      );
      expect(fitMapToMarkersMock).not.toHaveBeenCalled();
    });

    it('should zoom to markers if multiple geopoints are provided', () => {
      componentRef.setInput('geopoints', mockMultipleGeopoints);
      componentRef.setInput('gpsPosition', null);

      fixture.detectChanges();
      vi.runAllTimers();

      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockMultipleGeopoints[0],
        expect.any(Object),
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
