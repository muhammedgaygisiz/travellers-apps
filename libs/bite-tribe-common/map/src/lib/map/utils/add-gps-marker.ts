import L from 'leaflet';
import { Geopoint } from 'model';
import { geopointToLatLng } from './geopoint-to-lat-lng';

export const GPS_MARKER_TAG = 'isGpsUserMarker';

interface GpsMarker extends L.Marker {
  [GPS_MARKER_TAG]: boolean;
}

const createUserMarkerIcon = (): L.DivIcon =>
  L.divIcon({
    className: 'leaflet-usermarker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: '<i class="inner"></i><i class="pulse"></i>',
  });

export const isGpsMarker = (layer: L.Layer): layer is GpsMarker =>
  GPS_MARKER_TAG in layer && (layer as GpsMarker)[GPS_MARKER_TAG] === true;

export const addGpsMarker = (gpsPosition: Geopoint, map: L.Map): void => {
  if (!gpsPosition || !map) return;

  const latLng = geopointToLatLng(gpsPosition);
  const userMarker = L.marker(latLng, { icon: createUserMarkerIcon() }) as GpsMarker;
  userMarker[GPS_MARKER_TAG] = true;
  userMarker.addTo(map);
};
