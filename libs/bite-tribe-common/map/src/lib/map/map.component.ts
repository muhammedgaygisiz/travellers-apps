import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Geopoint } from 'model';

export interface Position {
  latitude: number;
  longitude: number;
}

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
  position = input<Geopoint | null | undefined>();
  positionSelected = output<Position>();

  private map!: L.Map;
  private marker: L.Marker | null = null;

  private readonly mapChild = viewChild<ElementRef>('map');

  createMapEffect = afterRenderEffect(() => {
    const mapElement = this.mapChild();

    if (mapElement && !this.map) {
      this.map = L.map(mapElement.nativeElement);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      const newPosition = this.position();
      if (newPosition) {
        this.updateMarker(newPosition);
        this.map.setView([newPosition.latitude, newPosition.longitude], 15);
      } else {
        this.map.setView([0, 0], 2);
      }

      // this.map.on('click', (e: L.LeafletMouseEvent) => {
      //   const position: Position = {
      //     latitude: e.latlng.lat,
      //     longitude: e.latlng.lng,
      //   };
      //   this.updateMarker(position);
      //   this.positionSelected.emit(position);
      // });

      // Force a map redraw
      setTimeout(() => {
        this.map.invalidateSize();
      }, 0);
    }
  });

  setPositionEffect = effect(() => {
    const newPosition = this.position();

    if (this.map && newPosition) {
      this.updateMarker(newPosition);
      this.map.setView([newPosition.latitude, newPosition.longitude], 15);

      return;
    }

    if (this.map && !newPosition) {
      this.map.setView([0, 0], 2);
      if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = null;
      }
    }
  });

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private updateMarker(position: Position) {
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.marker = L.marker([position.latitude, position.longitude]).addTo(
      this.map
    );
  }
}
