import { Geopoint } from 'model';
import * as L from 'leaflet';
import { fitMapToMarkers } from './fit-map-to-markers';
import { zoomToGeopoint } from './zoom-to-geopoint';
import { addGpsMarker } from './add-gps-marker';
import { removeGpsMarker } from './remove-gps-marker';

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
    removeGpsMarker(map);
    return;
  }

  zoomToGeopoint(gpsPosition, map);
  addGpsMarker(gpsPosition, map);
};
