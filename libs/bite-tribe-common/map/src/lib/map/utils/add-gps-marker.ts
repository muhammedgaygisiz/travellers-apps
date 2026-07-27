import L from 'leaflet';
import 'leaflet-usermarker';
import { Geopoint } from 'model';
import { geopointToLatLng } from './geopoint-to-lat-lng';
import { GPS_MARKER_TAG, GpsMarker } from './gps-marker';
import { removeGpsMarker } from './remove-gps-marker';

type LeafletWithUserMarker = typeof L & {
  userMarker: (
    latlng: L.LatLngExpression,
    options?: {
      pulsing?: boolean;
      accuracy?: number;
      smallIcon?: boolean;
    },
  ) => L.Marker;
};

export const addGpsMarker = (
  gpsPosition: Geopoint | null,
  map: L.Map | null,
): void => {
  if (!gpsPosition || !map) return;

  // The map may only ever show a single GPS marker. Drop the previous one so a
  // recenter or a fresh position moves the marker instead of stacking a new one
  // on top of the old position.
  removeGpsMarker(map);

  const latLng = geopointToLatLng(gpsPosition);
  const userMarker = (L as LeafletWithUserMarker).userMarker(latLng, {
    pulsing: true,
    smallIcon: true,
  }) as GpsMarker;
  userMarker[GPS_MARKER_TAG] = true;
  userMarker.addTo(map);
};
