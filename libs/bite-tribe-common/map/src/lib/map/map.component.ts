import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Geopoint } from 'model';
import { zoomToGpsOrDefault } from './utils/zoom-to-gps-or-default';
import { fitMapToMarkers } from './utils/fit-map-to-markers';
import { clearMarkers } from './utils/clear-markers';
import { geopointsToMarkers } from './utils/geopoints-to-markers';
import { zoomToGeopoint } from './utils/zoom-to-geopoint';
import { createMap } from './utils/create-map';
import { TILE_LAYER_FACTORY } from './tile-layer.token';
import { zoomToMarkers } from './utils/zoom-to-markers';
import { focusMarker } from './utils/focus-marker';
import { addGpsMarker } from './utils/add-gps-marker';
import { removeGpsMarker } from './utils/remove-gps-marker';

// Fix for marker icons
const iconUrl = 'assets/leaflet/marker-icon.png';
const shadowUrl = 'assets/leaflet/marker-shadow.png';
const iconDefault = L.icon({
  iconUrl,
  shadowUrl,
  iconSize: [38, 58], // Increased size
  iconAnchor: [19, 58], // Adjusted anchor
  popupAnchor: [1, -44], // Adjusted popup anchor
  tooltipAnchor: [24, -38], // Adjusted tooltip anchor
  shadowSize: [58, 58], // Increased shadow size
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'bt-map',
  styleUrl: './map.component.scss',
  templateUrl: './map.component.html',
})
export class MapComponent implements OnDestroy {
  geopoints = input<Geopoint[] | null | undefined>([]);
  readonly = input(false, { transform: booleanAttribute });
  dragging = input(true, { transform: booleanAttribute });
  emitMarkerClick = input(false, { transform: booleanAttribute });
  enableZoom = input(true, { transform: booleanAttribute });
  refitOnGeopointChanges = input(false, { transform: booleanAttribute });
  clickOnMap = output<Geopoint>();
  clickOnMarker = output<Geopoint | undefined>();
  gpsPosition = input<Geopoint | null | undefined>();

  private readonly createTileLayer = inject(TILE_LAYER_FACTORY);
  private map!: L.Map;
  private markerClusterGroup: L.MarkerClusterGroup = L.markerClusterGroup();
  private markers: L.Marker[] = [];
  private hasAutoFitted = false;
  private readonly mapChild = viewChild<ElementRef>('map');

  isReadonly = computed(() => {
    const positionsList = this.geopoints();
    const moreThenOnePosition = positionsList && positionsList.length > 1;
    return this.readonly() || moreThenOnePosition;
  });

  createMapEffect = afterRenderEffect(() => {
    const mapElement = this.mapChild();

    if (!mapElement || !!this.map) {
      return;
    }

    this.map = createMap(mapElement, this.enableZoom(), this.dragging());
    this.createTileLayer().addTo(this.map);

    const gpsPosition = this.gpsPosition();
    const geopoints = this.cleanUpPoints();

    if (geopoints && geopoints.length > 0) {
      this.updateMarkers(geopoints);
      zoomToMarkers(gpsPosition, geopoints, this.markers, this.map);
      this.hasAutoFitted = true;
    } else if (gpsPosition) {
      zoomToGpsOrDefault(gpsPosition, this.markers, geopoints, this.map);
    } else {
      this.map.setView([0, 0], 2);
    }

    this.addMapClickEvent();

    this.forceMapRedraw();
  });

  /**
   * Keeps exactly one GPS marker on the map and moves it whenever a fresh
   * position arrives. Runs after `createMapEffect` so the map already exists on
   * the first pass.
   */
  gpsMarkerEffect = afterRenderEffect(() => {
    const gpsPosition = this.gpsPosition();

    if (!this.map) {
      return;
    }

    if (!gpsPosition) {
      removeGpsMarker(this.map);
      return;
    }

    addGpsMarker(gpsPosition, this.map);
  });

  private cleanUpPoints(): Geopoint[] {
    return (this.geopoints() || []).filter((point) => !!point);
  }

  /**
   * Recenters the camera on the current GPS position and shows the pulsing
   * user marker, mimicking the Google Maps "my location" button. Falls back to
   * fitting the existing markers when no GPS fix is available.
   */
  recenterOnGps(): void {
    if (!this.map) {
      return;
    }

    zoomToGpsOrDefault(
      this.gpsPosition(),
      this.markers,
      this.cleanUpPoints(),
      this.map,
    );
  }

  setGeopointsEffect = effect(() => {
    const geopoints = this.geopoints();

    if (!this.map) return;

    if (!geopoints?.length) {
      this.map.setView([0, 0], 2);
      clearMarkers(this.markerClusterGroup, this.map);
      this.markers = [];
      this.hasAutoFitted = false;
      return;
    }

    this.updateMarkers(geopoints);

    // Only fit the camera to the markers on the first data load. Subsequent
    // updates (e.g. a new bite arriving via the live stream) must leave the
    // camera untouched so the user keeps their current pan/zoom.
    if (this.hasAutoFitted && !this.refitOnGeopointChanges()) {
      return;
    }

    this.fitCameraToGeopoints(geopoints);
    this.hasAutoFitted = true;
  });

  private fitCameraToGeopoints(geopoints: Geopoint[]): void {
    const firstPosition = geopoints[0];

    // First focus on the first position briefly
    zoomToGeopoint(firstPosition, this.map);

    if (geopoints.length > 1) {
      // Then fit all markers after a short delay
      setTimeout(() => {
        fitMapToMarkers(this.markers, geopoints, this.map);
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private forceMapRedraw(): void {
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
  }

  private updateMarkers(positions: Geopoint[]): void {
    clearMarkers(this.markerClusterGroup, this.map);
    this.markers = geopointsToMarkers(positions);
    this.markerClusterGroup = L.markerClusterGroup()
      .addLayers(this.markers)
      .addTo(this.map);

    if (this.emitMarkerClick()) {
      this.addMarkerClickEvent();
    }
  }

  private addMapClickEvent(): void {
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const position: Geopoint = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      };

      focusMarker(undefined, this.markers, this.map);
      this.clickOnMarker.emit(undefined);

      if (!this.isReadonly()) {
        this.updateMarkers([position]);
        this.clickOnMap.emit(position);
      }
    });
  }

  private addMarkerClickEvent(): void {
    this.markers
      .filter((marker) => !!marker.options.title)
      .forEach((marker) => {
        marker.on('click', () => {
          const geopoint = this.geopoints()?.find(
            (gp) => gp.id === marker.options.title,
          );
          if (geopoint) {
            this.clickOnMarker.emit(geopoint);
            focusMarker(marker, this.markers, this.map);
          }
        });
      });
  }
}
