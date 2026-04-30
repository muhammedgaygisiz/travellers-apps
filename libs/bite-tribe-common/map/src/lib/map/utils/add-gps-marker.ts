import L from 'leaflet';
import { Geopoint } from 'model';
import { geopointToLatLng } from './geopoint-to-lat-lng';

export const GPS_MARKER_TAG = 'isGpsUserMarker';

const createUserMarkerIcon = (): L.DivIcon =>
  L.divIcon({
    className: 'leaflet-usermarker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: '<i class="inner"></i><i class="pulse"></i>',
  });

export const addGpsMarker = (gpsPosition: Geopoint, map: L.Map): void => {
  if (!gpsPosition || !map) return;

  const latLng = geopointToLatLng(gpsPosition);
  const userMarker = L.marker(latLng, { icon: createUserMarkerIcon() });
  (userMarker as any)[GPS_MARKER_TAG] = true;
  userMarker.addTo(map);
};
