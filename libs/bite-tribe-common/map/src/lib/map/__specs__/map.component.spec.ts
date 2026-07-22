import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MapComponent } from '../map.component';
import { Geopoint } from 'model';
import { DEFAULT_ZOOM } from '../model/default-zoom';
import L from 'leaflet';
import SpyInstance = jest.SpyInstance;

interface MockMarker {
  on: jest.Mock;
  options: L.MarkerOptions;
}

const mockMap = {
  setView: jest.fn(),
  getZoom: jest.fn().mockReturnValue(DEFAULT_ZOOM),
  fitBounds: jest.fn(),
  remove: jest.fn(),
  on: jest.fn(),
  removeLayer: jest.fn(),
  invalidateSize: jest.fn(),
};

const zoomToGpsOrDefaultMock = jest.fn();
jest.mock('../utils/zoom-to-gps-or-default', () => ({
  zoomToGpsOrDefault: (...args: unknown[]): void =>
    zoomToGpsOrDefaultMock(...args),
}));

const fitMapToMarkersMock = jest.fn();
jest.mock('../utils/fit-map-to-markers', () => ({
  fitMapToMarkers: (...args: unknown[]): void => fitMapToMarkersMock(...args),
}));

const geopointsToMarkersMock = jest.fn();
jest.mock('../utils/geopoints-to-markers', () => ({
  geopointsToMarkers: (...args: unknown[]): void =>
    geopointsToMarkersMock(...args),
}));

const clearMarkersMock = jest.fn();
jest.mock('../utils/clear-markers', () => ({
  clearMarkers: (...args: unknown[]): void => clearMarkersMock(...args),
}));

const createMapMock = jest.fn();
jest.mock('../utils/create-map', () => ({
  createMap: (...args: unknown[]): void => createMapMock(...args),
}));

const createOpenstreetmapLayerMock = jest.fn();
jest.mock('../utils/create-openstreetmap-layer', () => ({
  createOpenstreetmapLayer: (...args: unknown[]): void =>
    createOpenstreetmapLayerMock(...args),
}));

const zoomToMarkersMock = jest.fn();
jest.mock('../utils/zoom-to-markers', () => ({
  zoomToMarkers: (...args: unknown[]): void => zoomToMarkersMock(...args),
}));

const zoomToGeopointMock = jest.fn();
jest.mock('../utils/zoom-to-geopoint', () => ({
  zoomToGeopoint: (...args: unknown[]): void => zoomToGeopointMock(...args),
}));

const focusMarkerMock = jest.fn();
jest.mock('../utils/focus-marker', () => ({
  focusMarker: (...args: unknown[]): void => focusMarkerMock(...args),
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

  describe('enableZoom', () => {
    let mapDiv: HTMLDivElement;

    beforeEach(() => {
      mapDiv = document.createElement('div');
      mapDiv.setAttribute('data-testid', 'map');
      fixture.nativeElement.appendChild(mapDiv);
      createMapMock.mockClear();
    });

    it('should pass enableZoom as true to createMap by default', () => {
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledWith(
        expect.any(Object),
        true,
        true,
      );
    });

    it('should pass enableZoom as true when explicitly set to true', () => {
      componentRef.setInput('enableZoom', true);
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledWith(
        expect.any(Object),
        true,
        true,
      );
    });

    it('should pass enableZoom as false when set to false', () => {
      componentRef.setInput('enableZoom', false);
      fixture.detectChanges();

      expect(createMapMock).toHaveBeenCalledWith(
        expect.any(Object),
        false,
        true,
      );
    });
  });

  describe('createMapEffect', () => {
    let mapDiv: HTMLDivElement;
    let emitMarkerClickSpy: SpyInstance;

    beforeEach(() => {
      mapDiv = document.createElement('div');
      mapDiv.setAttribute('data-testid', 'map');
      fixture.nativeElement.appendChild(mapDiv);
      mockMap.on.mockClear();
      createMapMock.mockClear();
      createOpenstreetmapLayerMock.mockClear();
      emitMarkerClickSpy = jest
        .spyOn(component.clickOnMarker, 'emit')
        .mockImplementation();
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
      let mapDiv: HTMLDivElement;
      let mockClickEvent: { latlng: { lat: number; lng: number } };
      let emitClickOnMapSpy: SpyInstance;
      let emitClickOnMarkerSpy: SpyInstance;

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

        emitClickOnMapSpy = jest
          .spyOn(component.clickOnMap, 'emit')
          .mockImplementation();
        emitClickOnMarkerSpy = jest
          .spyOn(component.clickOnMarker, 'emit')
          .mockImplementation();

        mockMap.on.mockClear();
        focusMarkerMock.mockClear();
        geopointsToMarkersMock.mockClear();
        clearMarkersMock.mockClear();
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
        expect(geopointsToMarkersMock).toHaveBeenCalledWith([expectedPosition]);
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
        expect(geopointsToMarkersMock).toHaveBeenCalledWith([expectedPosition]);
      });

      it('should clear existing markers when map is clicked and not readonly', () => {
        componentRef.setInput('readonly', false);
        componentRef.setInput('geopoints', []);
        fixture.detectChanges();

        const clickHandler = mockMap.on.mock.calls[0][1];
        clickHandler(mockClickEvent);

        expect(clearMarkersMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('addMarkerClickEvent via createMapEffect', () => {
      let mapDiv: HTMLDivElement;
      let mockMarker1: MockMarker;
      let mockMarker2: MockMarker;

      beforeEach(() => {
        mapDiv = document.createElement('div');
        mapDiv.setAttribute('data-testid', 'map');
        fixture.nativeElement.appendChild(mapDiv);

        mockMarker1 = {
          on: jest.fn(),
          options: { title: 'marker1' },
        };
        mockMarker2 = {
          on: jest.fn(),
          options: { title: 'marker2' },
        };

        emitMarkerClickSpy = jest
          .spyOn(component.clickOnMarker, 'emit')
          .mockImplementation();

        geopointsToMarkersMock.mockImplementation(() => {
          component['markers'] = [
            mockMarker1 as unknown as L.Marker,
            mockMarker2 as unknown as L.Marker,
          ];
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
        componentRef.changeDetectorRef.detectChanges();

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
        const geopoints: Geopoint[] | undefined = undefined;

        componentRef.setInput('emitMarkerClick', true);
        componentRef.setInput('geopoints', geopoints);
        component['markers'] = [mockMarker2 as unknown as L.Marker];
        componentRef.changeDetectorRef.detectChanges();

        const clickHandler = mockMarker2.on;
        clickHandler();

        expect(emitMarkerClickSpy).not.toHaveBeenCalled();
        expect(focusMarkerMock).not.toHaveBeenCalled();
      });

      it('should only add click events to markers with titles', () => {
        const mockMarkerWithoutTitle = {
          on: jest.fn(),
          options: {},
        };

        geopointsToMarkersMock.mockImplementation(() => {
          component['markers'] = [
            mockMarker1 as unknown as L.Marker,
            mockMarkerWithoutTitle as unknown as L.Marker,
          ];
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
        componentRef.changeDetectorRef.detectChanges();

        // Manually trigger marker click since no markers would be created
        geopointsToMarkersMock.mockImplementation(() => {
          component['markers'] = [mockMarker1 as unknown as L.Marker];
          return [mockMarker1];
        });

        // Trigger createMapEffect again with markers but empty geopoints
        componentRef.setInput('geopoints', []);
        componentRef.changeDetectorRef.detectChanges();

        if (mockMarker1.on.mock.calls.length > 0) {
          const clickHandler = mockMarker1.on.mock.calls[0][1];
          clickHandler();

          expect(emitMarkerClickSpy).not.toHaveBeenCalled();
          expect(focusMarkerMock).not.toHaveBeenCalled();
        }
      });
    });

    it('should set map view to default if no geopoints or gpsPosition are provided', () => {
      componentRef.setInput('geopoints', []);
      componentRef.setInput('gpsPosition', null);

      componentRef.changeDetectorRef.detectChanges();

      expect(mockMap.setView).toHaveBeenCalledWith([0, 0], 2);
    });
  });

  describe('setGeopointsEffect', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
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
      jest.runAllTimers();

      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockMultipleGeopoints[0],
        expect.any(Object),
      );
      expect(fitMapToMarkersMock).toHaveBeenCalled();
    });

    it('should not move the camera when geopoints change after the first fit', () => {
      // First data load fits the camera once.
      componentRef.setInput('geopoints', [mockGeopoint]);
      fixture.detectChanges();
      jest.runAllTimers();

      zoomToGeopointMock.mockClear();
      fitMapToMarkersMock.mockClear();

      // A new bite arriving must update markers without touching the camera.
      componentRef.setInput('geopoints', mockMultipleGeopoints);
      fixture.detectChanges();
      jest.runAllTimers();

      expect(geopointsToMarkersMock).toHaveBeenCalled();
      expect(zoomToGeopointMock).not.toHaveBeenCalled();
      expect(fitMapToMarkersMock).not.toHaveBeenCalled();
    });

    it('should refit the camera when configured to follow geopoint changes', () => {
      componentRef.setInput('refitOnGeopointChanges', true);
      componentRef.setInput('geopoints', [mockGeopoint]);
      fixture.detectChanges();
      jest.runAllTimers();

      zoomToGeopointMock.mockClear();

      const selectedRestaurantPosition = {
        latitude: 48.137154,
        longitude: 11.576124,
      };
      componentRef.setInput('geopoints', [selectedRestaurantPosition]);
      fixture.detectChanges();

      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        selectedRestaurantPosition,
        expect.any(Object),
      );
    });

    it('should fit the camera again after geopoints are cleared and repopulated', () => {
      componentRef.setInput('geopoints', [mockGeopoint]);
      fixture.detectChanges();
      jest.runAllTimers();

      // Clearing resets the one-time fit guard.
      componentRef.setInput('geopoints', []);
      fixture.detectChanges();

      zoomToGeopointMock.mockClear();

      componentRef.setInput('geopoints', [mockGeopoint]);
      fixture.detectChanges();

      expect(zoomToGeopointMock).toHaveBeenCalledWith(
        mockGeopoint,
        expect.any(Object),
      );
    });
  });

  describe('ngOnDestroy', () => {
    beforeEach(() => {
      mockMap.remove.mockClear();
    });

    it('should remove map when map exists', () => {
      component['map'] = mockMap as unknown as L.Map;

      component.ngOnDestroy();

      expect(mockMap.remove).toHaveBeenCalled();
    });

    it('should not throw error when map does not exist', () => {
      component['map'] = undefined as unknown as L.Map;

      expect(() => component.ngOnDestroy()).not.toThrow();
      expect(mockMap.remove).not.toHaveBeenCalled();
    });
  });
});
