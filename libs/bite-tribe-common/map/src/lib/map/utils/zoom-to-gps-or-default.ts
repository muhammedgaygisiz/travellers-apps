import { Geopoint } from 'model';
import * as L from 'leaflet';
import { fitMapToMarkers } from './fit-map-to-markers';

export const zoomToGpsOrDefault = (
  gpsPosition: Geopoint | null | undefined,
  markers: L.Marker[],
  positions: Geopoint[] | null | undefined,
  map: L.Map
): void => {
  if (!map) {
    return;
  }

  if (!gpsPosition || !gpsPosition.latitude || !gpsPosition.longitude) {
    fitMapToMarkers(markers, positions, map);
    return;
  }

  const currentZoom = map.getZoom();
  map.setView([gpsPosition.latitude, gpsPosition.longitude], currentZoom || 15);
};
