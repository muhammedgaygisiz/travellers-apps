import * as L from 'leaflet';
import { LatLngExpression } from 'leaflet';
import { Geopoint } from 'model';
import { getMarkerWithColor } from './get-marker-with-color';
import { MarkerColor } from '../model/marker-color.enum';

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
      return L.marker(coordinates, {
        title: geopoint.id,
        icon: getMarkerWithColor(MarkerColor.RED),
      }).addTo(map);
    }
    return L.marker(coordinates, {
      icon: getMarkerWithColor(MarkerColor.RED),
    }).addTo(map);
  });
