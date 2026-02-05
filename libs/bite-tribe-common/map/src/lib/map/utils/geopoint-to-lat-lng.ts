import * as L from 'leaflet';
import { Geopoint } from 'model';

export const geopointToLatLng = (geopoint: Geopoint): L.LatLng => {
  return L.latLng(geopoint.latitude, geopoint.longitude);
};
