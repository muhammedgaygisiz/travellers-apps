import { L } from './leaflet-markercluster';

export const removeGpsMarker = (map: L.Map): void => {
  map.eachLayer((layer) => {
    if (layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });
};
