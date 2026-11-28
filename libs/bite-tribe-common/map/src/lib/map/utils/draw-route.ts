import L from 'leaflet';
import { Geopoint } from 'model';
import { MarkerColor } from '../model/marker-color.enum';

/**
 * Joins the positions with straight lines in the order given, or draws nothing
 * for fewer than two. The line does not take clicks, so the markers under it
 * stay tappable.
 */
export const drawRoute = (
  positions: Geopoint[],
  map: L.Map,
): L.Polyline | undefined =>
  positions.length < 2
    ? undefined
    : L.polyline(
        positions.map(
          ({ latitude, longitude }) => [latitude, longitude] as L.LatLngTuple,
        ),
        {
          color: MarkerColor.RED,
          weight: 3,
          opacity: 0.8,
          interactive: false,
        },
      ).addTo(map);
