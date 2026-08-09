import * as L from 'leaflet';
import { getMarkerWithColor } from './get-marker-with-color';
import { MarkerColor } from '../model/marker-color.enum';
import { getMarkerColor } from './marker-color-tag';

/**
 * Red markers darken when focused, which is the contrast the bite maps rely on.
 * A marker that carries its own colour keeps it, so a map that colours markers
 * by meaning does not lose that meaning on selection: size alone marks focus.
 */
const getFocusColor = (color: MarkerColor): MarkerColor =>
  color === MarkerColor.RED ? MarkerColor.DARKRED : color;

export const focusMarker = (
  marker: L.Marker | undefined,
  markers: L.Marker[],
  map: L.Map | undefined,
): void => {
  if (!map) {
    return;
  }

  markers.forEach((marker) => {
    marker.setIcon(
      getMarkerWithColor(getMarkerColor(marker), {
        rating: marker.options?.alt,
      }),
    );
  });

  if (marker) {
    marker.setIcon(
      getMarkerWithColor(getFocusColor(getMarkerColor(marker)), {
        size: 'big',
        rating: marker.options?.alt,
      }),
    );
  }
};
