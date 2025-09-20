import * as L from 'leaflet';
import { Geopoint } from 'model';
import { LatLngExpression } from 'leaflet';

export const geopointsToMarkers = (
  geopoints: Geopoint[],
  map: L.Map
): L.Marker[] =>
  geopoints.map((geopoint) => {
    const coordinates: LatLngExpression = [
      geopoint.latitude,
      geopoint.longitude,
    ];
    if (geopoint?.id) {
      return L.marker(coordinates, { title: geopoint.id }).addTo(map);
    }
    return L.marker(coordinates).addTo(map);
  });
