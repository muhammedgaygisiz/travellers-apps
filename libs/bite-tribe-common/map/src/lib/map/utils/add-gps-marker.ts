import * as L from 'leaflet';
import { Geopoint } from 'model';
import { geopointToLatLng } from './geopoint-to-lat-lng';

const GPS_MARKER_PANE = 'location-marker';
const GPS_MARKER_RADIUS = 20;
const GPS_MARKER_STYLE = {
  stroke: true,
  color: 'white',
  fillColor: '#007AFF',
  fillOpacity: 100,
};

const resizeCircle = (
  zoom: { start: number; end: number },
  map: L.Map,
  circle: L.Circle,
): void => {
  zoom.end = map.getZoom();
  const diff = zoom.start - zoom.end;
  if (diff > 0) {
    circle.setRadius(circle.getRadius() * 2);
  } else if (diff < 0) {
    circle.setRadius(circle.getRadius() / 2);
  }
};

export const addGpsMarker = (gpsPosition: Geopoint, map: L.Map): void => {
  if (!gpsPosition || !map) return;

  const latLng = geopointToLatLng(gpsPosition);

  const pane = map.createPane(GPS_MARKER_PANE);
  pane.style.zIndex = '999';

  const circle = L.circle(latLng, {
    radius: GPS_MARKER_RADIUS,
    pane: GPS_MARKER_PANE,
  })
    .setStyle(GPS_MARKER_STYLE)
    .addTo(map);

  const currentZoom = {
    start: map.getZoom(),
    end: map.getZoom(),
  };

  map.on('zoomstart', (): number => (currentZoom.start = map.getZoom()));
  map.on('zoomend', (): void => resizeCircle(currentZoom, map, circle));
};
