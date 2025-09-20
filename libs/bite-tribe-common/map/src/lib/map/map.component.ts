import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Geopoint } from 'model';
import { zoomToGpsOrDefault } from './utils/zoom-to-gps-or-default';
import { fitMapToMarkers } from './utils/fit-map-to-markers';
import { clearMarkers } from './utils/clear-markers';
import { geopointsToMarkers } from './utils/geopoints-to-markers';
import { zoomToGeopoint } from './utils/zoom-to-geopoint';
import { createMap } from './utils/create-map';
import { createOpenstreetmapLayer } from './utils/create-openstreetmap-layer';
import { zoomToMarkers } from './utils/zoom-to-markers';

// Fix for marker icons
const iconRetinaUrl = 'assets/leaflet/marker-icon-2x.png';
const iconUrl = 'assets/leaflet/marker-icon.png';
const shadowUrl = 'assets/leaflet/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
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
  emitMarkerClick = input(false, { transform: booleanAttribute });
  clickOnMap = output<Geopoint>();
  clickOnMarker = output<Geopoint>();
  gpsPosition = input<Geopoint | null | undefined>();

  private map!: L.Map;
  private markers: L.Marker[] = [];
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

    this.map = createMap(mapElement);
    createOpenstreetmapLayer().addTo(this.map);

    const gpsPosition = this.gpsPosition();
    const geopoints = this.geopoints();

    if (geopoints && geopoints.length > 0) {
      this.updateMarkers(geopoints);
      zoomToMarkers(gpsPosition, geopoints, this.markers, this.map);
    } else {
      zoomToGpsOrDefault(gpsPosition, this.markers, geopoints, this.map);
    }

    if (!this.isReadonly()) {
      this.addMapClickEvent();
    }

    if (this.emitMarkerClick()) {
      this.addMarkerClickEvent();
    }

    this.forceMapRedraw();
  });

  setGeopointsEffect = effect(() => {
    const geopoints = this.geopoints();

    if (!this.map) return;

    if (!geopoints?.length) {
      this.map.setView([0, 0], 2);
      clearMarkers(this.markers, this.map);
      this.markers = [];
      return;
    }

    this.updateMarkers(geopoints);

    const firstPosition = geopoints[0];

    // First focus on the first position briefly
    zoomToGeopoint(firstPosition, this.map);

    if (geopoints.length > 1) {
      // Then fit all markers after a short delay
      setTimeout(() => {
        fitMapToMarkers(this.markers, geopoints, this.map);
      }, 100);
    }
  });

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
    clearMarkers(this.markers, this.map);
    this.markers = geopointsToMarkers(positions, this.map);
  }

  private addMapClickEvent(): void {
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const position: Geopoint = {
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      };
      // Replace all markers with the clicked position
      this.updateMarkers([position]);
      this.clickOnMap.emit(position);
    });
  }

  private addMarkerClickEvent(): void {
    this.markers
      .filter((marker) => !!marker.options.title)
      .forEach((marker) => {
        marker.on('click', () => {
          const geopoint = this.geopoints()?.find(
            (gp) => gp.id === marker.options.title
          );
          if (geopoint) {
            this.clickOnMarker.emit(geopoint);
          }
        });
      });
  }
}
