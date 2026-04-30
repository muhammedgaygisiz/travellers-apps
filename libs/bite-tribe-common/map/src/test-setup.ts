import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import * as L from 'leaflet';

jest.mock('leaflet-usermarker', () => ({}));

(globalThis as typeof globalThis & { L?: typeof L }).L = L;

if (!(L as typeof L & { userMarker?: unknown }).userMarker) {
  (
    L as typeof L & {
      userMarker: (
        latlng: L.LatLngExpression,
        options?: L.MarkerOptions,
      ) => L.Marker;
    }
  ).userMarker = (
    latlng: L.LatLngExpression,
    options?: L.MarkerOptions,
  ): L.Marker => L.marker(latlng, options);
}

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
