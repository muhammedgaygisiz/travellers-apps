import * as L from 'leaflet';

export const createOpenstreetmapLayer = (): L.Layer => {
  return L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors © CARTO',
      noWrap: true,
      subdomains: 'abcd',
    }
  );
};
