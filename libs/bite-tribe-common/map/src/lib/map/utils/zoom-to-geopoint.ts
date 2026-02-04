import { L } from './leaflet-markercluster';
import { Geopoint } from 'model';
import { DEFAULT_ZOOM } from '../model/default-zoom';

export const zoomToGeopoint = (geopoint: Geopoint, map: L.Map): void => {
  const currentZoom = map.getZoom();
  map.setView(
    [geopoint.latitude, geopoint.longitude],
    currentZoom || DEFAULT_ZOOM,
  );
};
