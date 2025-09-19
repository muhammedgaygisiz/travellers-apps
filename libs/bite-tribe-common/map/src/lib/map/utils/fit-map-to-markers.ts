import * as L from 'leaflet';
import { Geopoint } from 'model';

export const fitMapToMarkers = (
  markers: L.Marker[],
  positions: Geopoint[] | null | undefined,
  map: L.Map
): void => {
  if (markers.length > 1) {
    if (positions) {
      const bounds = L.latLngBounds(
        positions.map((p) => [p.latitude, p.longitude] as L.LatLngTuple)
      );

      // Handle case where markers are on opposite sides of the world
      if (bounds.getWest() < -90 && bounds.getEast() > 90) {
        // Adjust bounds to prevent wrapping
        const normalizedPositions = positions.map((p) => {
          // Normalize longitude to -180 to 180
          let lng = p.longitude;
          while (lng > 180) lng -= 360;
          while (lng < -180) lng += 360;
          return [p.latitude, lng] as L.LatLngTuple;
        });

        const newBounds = L.latLngBounds(normalizedPositions);
        map.fitBounds(newBounds, { padding: [50, 50] });
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }
};
