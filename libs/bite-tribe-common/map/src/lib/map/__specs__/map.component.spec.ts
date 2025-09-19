import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MapComponent } from '../map.component';
import { Geopoint } from 'model';
import * as L from 'leaflet';
import { geopointsToMarkers } from '../utils/geopoints-to-markers';
import { clearMarkers } from '../utils/clear-markers';

// Mock Leaflet
const mockMap = {
  setView: jest.fn(),
  getZoom: jest.fn().mockReturnValue(15),
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
  zoomToGpsOrDefault: (): void => zoomToGpsOrDefaultMock(),
}));

const fitMapToMarkersMock = jest.fn();
jest.mock('../utils/fit-map-to-markers', () => ({
  fitMapToMarkers: (): void => fitMapToMarkersMock(),
}));

const geopointsToMarkersMock = jest.fn();
jest.mock('../utils/geopoints-to-markers', () => ({
  geopointsToMarkers: (): void => geopointsToMarkersMock(),
}));

const clearMarkersMock = jest.fn();
jest.mock('../utils/clear-markers', () => ({
  clearMarkers: (): void => clearMarkersMock(),
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

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isReadonly', () => {
    let mockTileLayer: any;
    let mockMarker: any;

    beforeEach(() => {
      mockTileLayer = {
        addTo: jest.fn().mockReturnThis(),
      };

      mockMarker = {
        addTo: jest.fn().mockReturnThis(),
      };

      // Setup Leaflet mocks
      (L.map as unknown as jest.Mock).mockReturnValue(mockMap);
      (L.tileLayer as unknown as jest.Mock).mockReturnValue(mockTileLayer);
      (L.marker as unknown as jest.Mock).mockReturnValue(mockMarker);

      // Mock component methods
      component['updateMarkers'] = jest.fn();
      component['startWithFirstPositionInList'] = jest.fn();
      component['forceMapRedraw'] = jest.fn();
    });

    it('should return true when readonly input is true', () => {
      componentRef.setInput('readonly', true);
      fixture.detectChanges();

      expect(component.isReadonly()).toBe(true);
    });

    it('should return true when there are multiple positions', () => {
      componentRef.setInput('positions', mockMultipleGeopoints);
      fixture.detectChanges();

      expect(component.isReadonly()).toBe(true);
    });

    it('should return false when readonly is false and single position', () => {
      componentRef.setInput('readonly', false);
      componentRef.setInput('positions', [mockGeopoint]);
      fixture.detectChanges();

      expect(component.isReadonly()).toBe(false);
    });

    it('should return false when readonly is false and no positions', () => {
      componentRef.setInput('readonly', false);
      componentRef.setInput('positions', []);
      fixture.detectChanges();

      expect(component.isReadonly()).toBe(false);
    });
  });

  describe('createMapEffect', () => {
    let mockTileLayer: any;
    let mockMarker: any;

    beforeEach(() => {
      mockTileLayer = {
        addTo: jest.fn().mockReturnThis(),
      };

      mockMarker = {
        addTo: jest.fn().mockReturnThis(),
      };

      // Setup Leaflet mocks
      (L.map as unknown as jest.Mock).mockReturnValue(mockMap);
      (L.tileLayer as unknown as jest.Mock).mockReturnValue(mockTileLayer);
      (L.marker as unknown as jest.Mock).mockReturnValue(mockMarker);

      // Mock component methods
      component['updateMarkers'] = jest.fn();
      component['startWithFirstPositionInList'] = jest.fn();
      component['forceMapRedraw'] = jest.fn();
    });

    it('should return early when map already exists', () => {
      component['map'] = mockMap as any;

      fixture.detectChanges();

      expect(L.map).not.toHaveBeenCalled();
    });

    it('should add click listener when not readonly', () => {
      componentRef.setInput('readonly', false);
      fixture.detectChanges();

      fixture.detectChanges();

      expect(mockMap.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should not add click listener when readonly', () => {
      componentRef.setInput('readonly', true);
      fixture.detectChanges();

      fixture.detectChanges();

      expect(mockMap.on).not.toHaveBeenCalled();
    });

    it('should not add click listener when multiple positions (automatically readonly)', () => {
      componentRef.setInput('readonly', false);
      componentRef.setInput('positions', mockMultipleGeopoints);
      fixture.detectChanges();

      fixture.detectChanges();

      expect(mockMap.on).not.toHaveBeenCalled();
    });

    it('should handle map click event correctly', () => {
      componentRef.setInput('readonly', false);
      fixture.detectChanges();
      jest.spyOn(component.positionSelected, 'emit');

      fixture.detectChanges();

      // Get the click handler that was registered
      const clickHandler = (mockMap.on as jest.Mock).mock.calls[0][1];
      const mockClickEvent = {
        latlng: { lat: 50.0, lng: 1.0 },
      } as L.LeafletMouseEvent;

      clickHandler(mockClickEvent);

      expect(component['updateMarkers']).toHaveBeenCalledWith([
        {
          latitude: 50.0,
          longitude: 1.0,
        },
      ]);
      expect(component.positionSelected.emit).toHaveBeenCalledWith({
        latitude: 50.0,
        longitude: 1.0,
      });
    });

    it('should call forceMapRedraw after map creation', () => {
      fixture.detectChanges();

      expect(component['forceMapRedraw']).toHaveBeenCalled();
    });

    it('should handle single position without setTimeout', () => {
      componentRef.setInput('positions', [mockGeopoint]);
      jest.useFakeTimers();
      fixture.detectChanges();

      expect(component['updateMarkers']).toHaveBeenCalledWith([mockGeopoint]);
      expect(component['startWithFirstPositionInList']).toHaveBeenCalledWith([
        mockGeopoint,
      ]);

      // Verify setTimeout was not called for single position
      jest.advanceTimersByTime(100);
      expect(zoomToGpsOrDefaultMock).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('ngOnDestroy', () => {
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
