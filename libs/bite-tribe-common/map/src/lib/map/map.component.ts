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

const withNoWrapOptionToPreventWorldRepetition: L.MapOptions = {
  worldCopyJump: true, // Better behavior when panning across the date line
  maxBounds: [
    [-90, -180],
    [90, 180],
  ], // Restrict view to one world
  maxBoundsViscosity: 1.0, // How much to constrain the map to maxBounds (1.0 = fully constrained)
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'bt-map',
  styleUrl: './map.component.scss',
  templateUrl: './map.component.html',
})
export class MapComponent implements OnDestroy {
  positions = input<Geopoint[] | null | undefined>([]);
  readonly = input(false, { transform: booleanAttribute });
  positionSelected = output<Geopoint>();
  gpsPosition = input<Geopoint | null | undefined>();

  isReadonly = computed(() => {
    const positionsList = this.positions();
    const moreThenOnePosition = positionsList && positionsList.length > 1;
    return this.readonly() || moreThenOnePosition;
  });

  private map!: L.Map;
  private markers: L.Marker[] = [];

  private readonly mapChild = viewChild<ElementRef>('map');

  createMapEffect = afterRenderEffect(() => {
    const mapElement = this.mapChild();

    if (mapElement && !this.map) {
      this.map = L.map(
        mapElement.nativeElement,
        withNoWrapOptionToPreventWorldRepetition
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
        noWrap: true, // Prevents tile layer from wrapping around horizontally
      }).addTo(this.map);

      const positionsList = this.positions();
      if (positionsList && positionsList.length > 0) {
        this.updateMarkers(positionsList);

        this.startWithFirstPositionInList(positionsList);

        // If there are multiple positions, fit bounds after a short delay
        if (positionsList.length > 1) {
          setTimeout(() => {
            zoomToGpsOrDefault(
              this.gpsPosition(),
              this.markers,
              positionsList,
              this.map
            );
          }, 100);
        }
      } else {
        zoomToGpsOrDefault(
          this.gpsPosition(),
          this.markers,
          positionsList,
          this.map
        );
      }

      if (!this.isReadonly()) {
        this.map.on('click', (e: L.LeafletMouseEvent) => {
          const position: Geopoint = {
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          };
          // Replace all markers with the clicked position
          this.updateMarkers([position]);
          this.positionSelected.emit(position);
        });
      }

      this.forceMapRedraw();
    }
  });

  setPositionsEffect = effect(() => {
    const positionsList = this.positions();

    if (!this.map) return;

    if (positionsList && positionsList.length > 0) {
      this.updateMarkers(positionsList);

      // Always focus on the first position first
      const firstPosition = positionsList[0];

      if (positionsList.length === 1) {
        // Single position case - zoom to it
        const currentZoom = this.map.getZoom();
        this.map.setView(
          [firstPosition.latitude, firstPosition.longitude],
          currentZoom || 15
        );
      } else {
        // First focus on the first position briefly
        this.map.setView([firstPosition.latitude, firstPosition.longitude], 15);

        // Then fit all markers after a short delay
        setTimeout(() => {
          fitMapToMarkers(this.markers, positionsList, this.map);
        }, 100);
      }
      return;
    }

    // No positions available
    if (this.map && (!positionsList || positionsList.length === 0)) {
      this.map.setView([0, 0], 2);
      clearMarkers(this.markers, this.map);
      this.markers = [];
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

  private startWithFirstPositionInList(positionsList: Geopoint[]): void {
    const firstPosition = positionsList[0];
    this.map.setView([firstPosition.latitude, firstPosition.longitude], 15);
  }

  private updateMarkers(positions: Geopoint[]): void {
    clearMarkers(this.markers, this.map);
    this.markers = geopointsToMarkers(positions, this.map);
  }
}
