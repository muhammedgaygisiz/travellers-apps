import { L } from './leaflet-markercluster';
import { Geopoint } from 'model';

export const geopointToLatLng = (geopoint: Geopoint): L.LatLng => {
  return L.latLng(geopoint.latitude, geopoint.longitude);
};
