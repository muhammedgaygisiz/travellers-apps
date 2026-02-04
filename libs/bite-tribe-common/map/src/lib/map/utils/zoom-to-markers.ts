import { zoomToGpsOrDefault } from './zoom-to-gps-or-default';
import { Geopoint } from 'model';
import { zoomToGeopoint } from './zoom-to-geopoint';
import { L } from './leaflet-markercluster';

const startWithFirstPositionInList = (
  positionsList: Geopoint[],
  map: L.Map,
): void => {
  const firstPosition = positionsList[0];
  zoomToGeopoint(firstPosition, map);
};

export const zoomToMarkers = (
  gpsPosition: Geopoint | null | undefined,
  geopoints: Geopoint[],
  markers: L.Marker[],
  map: L.Map,
): void => {
  // First focus on the first position briefly
  startWithFirstPositionInList(geopoints, map);

  // If there are multiple positions, fit bounds after a short delay
  if (geopoints.length > 1) {
    setTimeout(() => {
      zoomToGpsOrDefault(gpsPosition, markers, geopoints, map);
    }, 100);
  }
};
