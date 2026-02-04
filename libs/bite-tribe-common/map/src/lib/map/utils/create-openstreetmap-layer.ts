import { L } from './leaflet-markercluster';

export const createOpenstreetmapLayer = (): L.Layer => {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
    noWrap: true, // Prevents tile layer from wrapping around horizontally
  });
};
