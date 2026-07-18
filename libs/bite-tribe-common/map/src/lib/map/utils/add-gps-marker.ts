import L from 'leaflet';
import 'leaflet-usermarker';
import { Geopoint } from 'model';
import { geopointToLatLng } from './geopoint-to-lat-lng';
import { GPS_MARKER_TAG, GpsMarker } from './gps-marker';

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

  const latLng = geopointToLatLng(gpsPosition);
  const userMarker = (L as LeafletWithUserMarker).userMarker(latLng, {
    pulsing: true,
    smallIcon: true,
  }) as GpsMarker;
  userMarker[GPS_MARKER_TAG] = true;
  userMarker.addTo(map);
};
