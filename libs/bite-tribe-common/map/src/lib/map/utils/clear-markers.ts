import L from 'leaflet';

export const clearMarkers = (
  markerClusterGroup: L.Layer | null,
  map: L.Map,
): void => {
  if (markerClusterGroup) {
    map.removeLayer(markerClusterGroup);
  }
};
