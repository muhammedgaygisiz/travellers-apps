import * as L from 'leaflet';
import { GPS_MARKER_TAG } from './add-gps-marker';

export const removeGpsMarker = (map: L.Map): void => {
  map.eachLayer((layer) => {
    if ((layer as any)[GPS_MARKER_TAG]) {
      map.removeLayer(layer);
    }
  });
};
