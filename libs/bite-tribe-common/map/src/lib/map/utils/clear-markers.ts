import * as L from 'leaflet';

export const clearMarkers = (markers: L.Marker[], map: L.Map): void => {
  if (markers.length > 0) {
    markers.forEach((marker) => {
      map.removeLayer(marker);
    });
  }
};
