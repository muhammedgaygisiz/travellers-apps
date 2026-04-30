import L from 'leaflet';

export const GPS_MARKER_TAG = 'isGpsUserMarker';

export interface GpsMarker extends L.Marker {
  [GPS_MARKER_TAG]: boolean;
}

export const isGpsMarker = (layer: L.Layer): layer is GpsMarker =>
  GPS_MARKER_TAG in layer && (layer as GpsMarker)[GPS_MARKER_TAG] === true;
