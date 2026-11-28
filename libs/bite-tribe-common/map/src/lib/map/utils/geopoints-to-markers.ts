import L from 'leaflet';
import { Geopoint } from 'model';
import { getMarkerWithColor } from './get-marker-with-color';
import { MarkerColor } from '../model/marker-color.enum';
import { setMarkerColor } from './marker-color-tag';
import { setMarkerLabel } from './marker-label-tag';

export const geopointsToMarkers = (
  geopoints: Geopoint[],
  colorById: Record<string, MarkerColor> = {},
  labelById: Record<string, string> = {},
): L.Marker[] =>
  geopoints.map((geopoint) => {
    const coordinates: L.LatLngExpression = [
      geopoint.latitude,
      geopoint.longitude,
    ];
    const color = (geopoint.id && colorById[geopoint.id]) || MarkerColor.RED;
    const label = geopoint.id ? labelById[geopoint.id] : undefined;

    const marker = L.marker(coordinates, {
      title: geopoint.id,
      icon: getMarkerWithColor(color, {
        rating: geopoint.rating?.toString(),
        label,
      }),
      alt: geopoint.rating?.toString(),
    });

    return setMarkerLabel(setMarkerColor(marker, color), label);
  });
