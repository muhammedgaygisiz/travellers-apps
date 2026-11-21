import * as L from 'leaflet';
import { Geopoint } from 'model';
import { DEFAULT_ZOOM } from '../model/default-zoom';

/**
 * The zoom of the world view a map opens on before it has anything to show
 * (`setView([0, 0], 2)`).
 */
export const WORLD_ZOOM = 2;

/**
 * Centres the map on a geopoint, keeping the zoom the user chose. At the world
 * view, or before the map has a zoom, it goes to street level instead: a point
 * centred at world zoom shows a continent, not the place (GitHub issue #2226,
 * where a restaurant's position arrived after the map had opened on the world
 * and stayed there).
 */
export const zoomToGeopoint = (geopoint: Geopoint, map: L.Map): void => {
  const currentZoom = map.getZoom();
  map.setView(
    [geopoint.latitude, geopoint.longitude],
    currentZoom && currentZoom > WORLD_ZOOM ? currentZoom : DEFAULT_ZOOM,
  );
};
