import L from 'leaflet';

/**
 * Key under which a marker remembers the label it was built with, so focusing
 * a marker redraws every marker with its own label rather than dropping it.
 */
export const MARKER_LABEL_TAG = '__markerLabel';

type LabelledMarker = L.Marker & { [MARKER_LABEL_TAG]?: string };

export const setMarkerLabel = (
  marker: L.Marker,
  label: string | undefined,
): L.Marker => {
  if (label !== undefined) {
    (marker as LabelledMarker)[MARKER_LABEL_TAG] = label;
  }

  return marker;
};

export const getMarkerLabel = (marker: L.Marker): string | undefined =>
  (marker as LabelledMarker)[MARKER_LABEL_TAG];
