import { focusMarker } from '../focus-marker';
import { MarkerColor } from '../../model/marker-color.enum';
import { setMarkerColor } from '../marker-color-tag';
import * as L from 'leaflet';

const getMarkerWithColorMock = jest.fn();
jest.mock('../get-marker-with-color', () => ({
  getMarkerWithColor: (...args: unknown[]): void =>
    getMarkerWithColorMock(...args),
}));

describe('focusMarker', () => {
  const mockSetIcon = jest.fn();
  const mockMarker1 = {
    setIcon: mockSetIcon,
    options: { alt: '2' },
  } as unknown as L.Marker;
  const mockMarker2 = { setIcon: mockSetIcon } as unknown as L.Marker;
  const mockMap = {} as L.Map;
  const focusedMarker = mockMarker1;

  beforeEach(() => {
    mockSetIcon.mockClear();
    getMarkerWithColorMock.mockClear();
  });

  it('should do nothing if map is undefined', () => {
    const markers = [mockMarker1, mockMarker2];
    const mockMap = undefined;

    focusMarker(focusedMarker, markers, mockMap);

    expect(mockSetIcon).not.toHaveBeenCalled();
  });

  it('should set all markers to RED and the focused marker to DARKRED', () => {
    const markers = [mockMarker1, mockMarker2];

    focusMarker(focusedMarker, markers, mockMap);

    expect(mockSetIcon).toHaveBeenCalledTimes(3);
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(
      MarkerColor.RED,
      expect.anything(),
    );
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.DARKRED, {
      size: 'big',
      rating: '2',
    });
  });

  it('should keep a coloured marker on its own colour when focused', () => {
    const coloredMarker = setMarkerColor(
      { setIcon: mockSetIcon, options: {} } as unknown as L.Marker,
      MarkerColor.BLUE,
    );

    focusMarker(coloredMarker, [coloredMarker], mockMap);

    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.BLUE, {
      size: 'big',
      rating: undefined,
    });
    expect(getMarkerWithColorMock).not.toHaveBeenCalledWith(
      MarkerColor.DARKRED,
      expect.anything(),
    );
  });

  it('should restore unfocused markers to their own colour', () => {
    const blueMarker = setMarkerColor(
      { setIcon: mockSetIcon, options: {} } as unknown as L.Marker,
      MarkerColor.BLUE,
    );
    const greenMarker = setMarkerColor(
      { setIcon: mockSetIcon, options: {} } as unknown as L.Marker,
      MarkerColor.GREEN,
    );

    focusMarker(blueMarker, [blueMarker, greenMarker], mockMap);

    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.GREEN, {
      rating: undefined,
    });
  });

  it('should set all markers to RED if focused marker is undefined', () => {
    const markers = [mockMarker1, mockMarker2];

    focusMarker(undefined, markers, mockMap);

    expect(getMarkerWithColorMock).toHaveBeenCalledTimes(2);
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(
      MarkerColor.RED,
      expect.anything(),
    );
    expect(getMarkerWithColorMock).not.toHaveBeenCalledWith(
      MarkerColor.DARKRED,
      expect.anything(),
    );
  });
});
