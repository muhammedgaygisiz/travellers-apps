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
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-map',
  styleUrl: './map.component.scss',
  templateUrl: './map.component.html',
})
export class MapComponent implements OnDestroy {
  positions = input<Geopoint[] | null | undefined>([]);
  readonly = input(false, { transform: booleanAttribute });
  positionSelected = output<Geopoint>();

  // Compute if the map should be readonly based on positions length or explicit readonly input
  isReadonly = computed(() => {
    const positionsList = this.positions();
    return this.readonly() || (positionsList && positionsList.length > 1);
  });

  private map!: L.Map;
  private markers: L.Marker[] = [];

  private readonly mapChild = viewChild<ElementRef>('map');

  createMapEffect = afterRenderEffect(() => {
    const mapElement = this.mapChild();

    if (mapElement && !this.map) {
      // Configure map with noWrap option to prevent repetition of world map
      this.map = L.map(mapElement.nativeElement, {
        worldCopyJump: true, // Better behavior when panning across the date line
        maxBounds: [
          [-90, -180],
          [90, 180],
        ], // Restrict view to one world
        maxBoundsViscosity: 1.0, // How much to constrain the map to maxBounds (1.0 = fully constrained)
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
        noWrap: true, // Prevents tile layer from wrapping around horizontally
      }).addTo(this.map);

      const positionsList = this.positions();
      if (positionsList && positionsList.length > 0) {
        this.updateMarkers(positionsList);

        // Always start by focusing on the first position in the list
        const firstPosition = positionsList[0];
        this.map.setView([firstPosition.latitude, firstPosition.longitude], 15);

        // If there are multiple positions, fit bounds after a short delay
        if (positionsList.length > 1) {
          setTimeout(() => {
            this.fitMapToMarkers();
          }, 100);
        }
      } else {
        this.map.setView([0, 0], 2);
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

      // Force a map redraw
      setTimeout(() => {
        this.map.invalidateSize();
      }, 0);
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
          this.fitMapToMarkers();
        }, 100);
      }
      return;
    }

    // No positions available
    if (this.map && (!positionsList || positionsList.length === 0)) {
      this.map.setView([0, 0], 2);
      this.clearMarkers();
    }
  });

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private updateMarkers(positions: Geopoint[]) {
    this.clearMarkers();

    positions.forEach((position) => {
      const marker = L.marker([position.latitude, position.longitude]).addTo(
        this.map
      );
      this.markers.push(marker);
    });
  }

  private clearMarkers() {
    if (this.markers.length > 0) {
      this.markers.forEach((marker) => {
        this.map.removeLayer(marker);
      });
      this.markers = [];
    }
  }

  private fitMapToMarkers() {
    if (this.markers.length > 1) {
      const positionsList = this.positions();
      if (positionsList) {
        const bounds = L.latLngBounds(
          positionsList.map((p) => [p.latitude, p.longitude] as L.LatLngTuple)
        );

        // Handle case where markers are on opposite sides of the world
        if (bounds.getWest() < -90 && bounds.getEast() > 90) {
          // Adjust bounds to prevent wrapping
          const normalizedPositions = positionsList.map((p) => {
            // Normalize longitude to -180 to 180
            let lng = p.longitude;
            while (lng > 180) lng -= 360;
            while (lng < -180) lng += 360;
            return [p.latitude, lng] as L.LatLngTuple;
          });

          const newBounds = L.latLngBounds(normalizedPositions);
          this.map.fitBounds(newBounds, { padding: [50, 50] });
        } else {
          // Standard case
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  }
}
