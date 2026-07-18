import L from 'leaflet';

export const clearMarkers = (
  markerClusterGroup: L.MarkerClusterGroup | null,
  map: L.Map,
): void => {
  if (markerClusterGroup) {
    map.removeLayer(markerClusterGroup);
  }
};
