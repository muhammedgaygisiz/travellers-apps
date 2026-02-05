import * as L from 'leaflet';
import { getMarkerWithColor } from './get-marker-with-color';
import { MarkerColor } from '../model/marker-color.enum';

export const focusMarker = (
  marker: L.Marker | undefined,
  markers: L.Marker[],
  map: L.Map,
): void => {
  if (!map) {
    return;
  }

  markers.forEach((marker) => {
    marker.setIcon(
      getMarkerWithColor(MarkerColor.RED, { rating: marker.options?.alt }),
    );
  });

  if (marker) {
    marker.setIcon(
      getMarkerWithColor(MarkerColor.DARKRED, {
        size: 'big',
        rating: marker.options?.alt,
      }),
    );
  }
};
