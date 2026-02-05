export default {
  map: jest.fn(() => ({
    setView: jest.fn(),
    remove: jest.fn(),
  })),
  tileLayer: jest.fn((_, options) => ({
    addTo: jest.fn(),
    options,
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  icon: jest.fn(),
  Marker: {
    prototype: {
      options: {
        icon: {},
      },
    },
  },
  markerClusterGroup: jest.fn(() => ({
    addLayers: jest.fn(() => ({
      addTo: jest.fn(),
    })),
  })),
};
