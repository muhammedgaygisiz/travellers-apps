import { L } from './leaflet-markercluster';

export const clearMarkers = (
  markerClusterGroup: L.MarkerClusterGroup,
  map: L.Map,
): void => {
  if (markerClusterGroup) {
    map.removeLayer(markerClusterGroup);
  }
};
