import * as L from 'leaflet';
import { Geopoint } from 'model';

export const geopointsToMarkers = (
  geopoints: Geopoint[],
  map: L.Map
): L.Marker[] =>
  geopoints.map((geopoint) =>
    L.marker([geopoint.latitude, geopoint.longitude]).addTo(map)
  );
