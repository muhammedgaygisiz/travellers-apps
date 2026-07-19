import { InjectionToken } from '@angular/core';
import type { Layer } from 'leaflet';
import { createOpenstreetmapLayer } from './utils/create-openstreetmap-layer';

/**
 * Factory that produces the base tile layer for the map component.
 *
 * Defaults to the live OpenStreetMap layer for the real applications. Storybook
 * overrides it under Loki with a deterministic blank layer so visual-regression
 * captures do not depend on live, non-deterministic map tiles.
 */
export type TileLayerFactory = () => Layer;

export const TILE_LAYER_FACTORY = new InjectionToken<TileLayerFactory>(
  'bt-map.tile-layer-factory',
  {
    providedIn: 'root',
    factory: (): TileLayerFactory => createOpenstreetmapLayer,
  },
);
