import L from 'leaflet';

// Deterministic, offline replacement for the live OpenStreetMap tile layer.
//
// Inside the Loki docker Chrome the real OSM tiles are blocked or flaky, and
// when they do load they rotate subdomains and change over time, so they can
// never be a stable visual-regression baseline. This layer paints a uniform
// neutral tile with no network request, so the map area and its markers render
// identically on every capture. Used only from Storybook under Loki; the real
// applications always use createOpenstreetmapLayer.
export const createBlankTileLayer = (): L.Layer => {
  const BlankGridLayer = L.GridLayer.extend({
    createTile(): HTMLElement {
      const tile = document.createElement('div');
      tile.style.width = '100%';
      tile.style.height = '100%';
      tile.style.boxSizing = 'border-box';
      tile.style.background = '#e8eaed';
      return tile;
    },
  });

  return new BlankGridLayer();
};
