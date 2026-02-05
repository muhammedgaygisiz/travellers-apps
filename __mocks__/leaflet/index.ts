export default {
  map: jest.fn((nativeElement, options) => ({
    setView: jest.fn(() => ({
      eachLayer: jest.fn(),
    })),
    remove: jest.fn(),
    eachLayer: jest.fn(),
    options,
  })),
  tileLayer: jest.fn((_, options) => ({
    addTo: jest.fn(),
    options,
  })),
  marker: jest.fn((coords, opts) => ({
    addTo: jest.fn(),
    getLatLng: jest.fn(() => ({ lat: coords[0], lng: coords[1] })),
    options: opts,
  })),
  icon: jest.fn(),
  Marker: {
    prototype: {
      options: {
        icon: {},
      },
    },
  },
  circle: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  markerClusterGroup: jest.fn(() => ({
    addLayers: jest.fn(() => ({
      addTo: jest.fn(),
    })),
  })),
  latLngBounds: jest.fn(() => ({
    getWest: jest.fn(),
  })),
  latLng: jest.fn((lat, lng) => ({
    lat,
    lng,
  })),
};
