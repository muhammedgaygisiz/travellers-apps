import L from 'leaflet';
import { MarkerColor } from '../model/marker-color.enum';

/**
 * Key under which a marker remembers the colour it was built with, so focusing
 * a marker can restore the other markers to their own colour instead of
 * repainting the whole map red.
 */
export const MARKER_COLOR_TAG = '__markerColor';

export type ColoredMarker = L.Marker & {
  [MARKER_COLOR_TAG]?: MarkerColor;
};

export const setMarkerColor = (
  marker: L.Marker,
  color: MarkerColor,
): L.Marker => {
  (marker as ColoredMarker)[MARKER_COLOR_TAG] = color;

  return marker;
};

export const getMarkerColor = (marker: L.Marker): MarkerColor =>
  (marker as ColoredMarker)[MARKER_COLOR_TAG] ?? MarkerColor.RED;
