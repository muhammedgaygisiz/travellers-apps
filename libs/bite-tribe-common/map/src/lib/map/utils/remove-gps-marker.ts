import * as L from 'leaflet';
import { isGpsMarker } from './add-gps-marker';

export const removeGpsMarker = (map: L.Map): void => {
  map.eachLayer((layer) => {
    if (isGpsMarker(layer)) {
      map.removeLayer(layer);
    }
  });
};
