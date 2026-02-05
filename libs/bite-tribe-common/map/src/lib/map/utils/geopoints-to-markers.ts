import * as L from 'leaflet';
import { Geopoint } from 'model';
import { getMarkerWithColor } from './get-marker-with-color';
import { MarkerColor } from '../model/marker-color.enum';

export const geopointsToMarkers = (geopoints: Geopoint[]): L.Marker[] =>
  geopoints.map((geopoint) => {
    const coordinates: L.LatLngExpression = [
      geopoint.latitude,
      geopoint.longitude,
    ];
    return L.marker(coordinates, {
      title: geopoint.id,
      icon: getMarkerWithColor(MarkerColor.RED, {
        rating: geopoint.rating?.toString(),
      }),
      alt: geopoint.rating?.toString(),
    });
  });
