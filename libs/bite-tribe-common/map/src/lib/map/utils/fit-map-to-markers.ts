import L, { LatLngTuple } from 'leaflet';
import { Geopoint } from 'model';

const normalizePositions = (positions: Geopoint[]): LatLngTuple[] => {
  // Adjust bounds to prevent wrapping
  return positions.map((p) => {
    // Normalize longitude to -180 to 180
    let lng = p.longitude;
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    return [p.latitude, lng] as L.LatLngTuple;
  });
};
export const fitMapToMarkers = (
  markers: L.Marker[],
  positions: Geopoint[] | null | undefined,
  map: L.Map,
): void => {
  if (markers.length < 2) {
    return;
  }

  if (!positions) {
    return;
  }

  const latLngTuples = positions.map(
    (p) => [p.latitude, p.longitude] as L.LatLngTuple,
  );
  const bounds = L.latLngBounds(latLngTuples);

  const markersInOppositeSidesOfTheWorld =
    bounds.getWest() < -180 && bounds.getEast() > 180;

  if (markersInOppositeSidesOfTheWorld) {
    const normalizedPositions = normalizePositions(positions);

    const newBounds = L.latLngBounds(normalizedPositions);
    map.fitBounds(newBounds, { padding: [50, 50] });
    return;
  }

  map.fitBounds(bounds, { padding: [50, 50] });
};
