import { geopointToLatLng } from '../geopoint-to-lat-lng';

jest.mock('../leaflet-markercluster', () => ({
  L: {
    latLng: (lat: number, lng: number): any => ({ lat, lng }),
  },
}));

describe('geopointToLatLng', () => {
  it('should convert Geopoint to L.LatLng correctly', () => {
    const geopoint = { latitude: 51.505, longitude: -0.09 };
    const latLng = geopointToLatLng(geopoint);
    expect(latLng.lat).toBe(51.505);
    expect(latLng.lng).toBe(-0.09);
  });

  it('should handle negative coordinates', () => {
    const geopoint = { latitude: -33.865143, longitude: 151.2099 };
    const latLng = geopointToLatLng(geopoint);
    expect(latLng.lat).toBe(-33.865143);
    expect(latLng.lng).toBe(151.2099);
  });

  it('should handle zero coordinates', () => {
    const geopoint = { latitude: 0, longitude: 0 };
    const latLng = geopointToLatLng(geopoint);
    expect(latLng.lat).toBe(0);
    expect(latLng.lng).toBe(0);
  });
});
