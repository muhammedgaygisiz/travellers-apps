import * as L from 'leaflet';
import { getMarkerWithColor } from './get-marker-with-color';
import { MarkerColor } from '../model/marker-color.enum';

export const focusMarker = (
  marker: L.Marker,
  markers: L.Marker[],
  map: L.Map
): void => {
  if (!marker || !map) {
    return;
  }

  markers.forEach((marker) => {
    marker.setIcon(getMarkerWithColor(MarkerColor.RED));
  });
  marker.setIcon(getMarkerWithColor(MarkerColor.DARKRED));
};
