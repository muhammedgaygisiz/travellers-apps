import * as L from 'leaflet';

export const removeGpsMarker = (map: L.Map): void => {
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });
};
