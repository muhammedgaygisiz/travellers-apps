import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import * as L from 'leaflet';

export interface Position {
  lat: number;
  lng: number;
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
export class MapComponent implements OnInit, OnDestroy {
  positionSelected = output<Position>();

  private map!: L.Map;
  private marker: L.Marker | null = null;

  ngOnInit() {
    this.initializeMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap() {
    this.map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Add click handler to the map
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const position: Position = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };
      this.updateMarker(position);
      this.positionSelected.emit(position);
    });
  }

  private updateMarker(position: Position) {
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.marker = L.marker([position.lat, position.lng]).addTo(this.map);
  }
}
