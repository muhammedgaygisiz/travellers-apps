import { focusMarker } from '../focus-marker';
import { MarkerColor } from '../../model/marker-color.enum';

const getMarkerWithColorMock = jest.fn();
jest.mock('../get-marker-with-color', () => ({
  getMarkerWithColor: (...args: any): void => getMarkerWithColorMock(...args),
}));

describe('focusMarker', () => {
  it('should do nothing if marker is undefined', () => {
    const mockSetIcon = jest.fn();
    const mockMarker1 = { setIcon: mockSetIcon } as any;
    const mockMarker2 = { setIcon: mockSetIcon } as any;
    const markers = [mockMarker1, mockMarker2];
    const focusedMarker = undefined as any;
    const mockMap = {} as any;

    focusMarker(focusedMarker, markers, mockMap);

    expect(mockSetIcon).not.toHaveBeenCalled();
  });

  it('should do nothing if map is undefined', () => {
    const mockSetIcon = jest.fn();
    const mockMarker1 = { setIcon: mockSetIcon } as any;
    const mockMarker2 = { setIcon: mockSetIcon } as any;
    const markers = [mockMarker1, mockMarker2];
    const focusedMarker = mockMarker1;
    const mockMap = undefined as any;

    focusMarker(focusedMarker, markers, mockMap);

    expect(mockSetIcon).not.toHaveBeenCalled();
  });

  it('should set all markers to RED and the focused marker to DARKRED', () => {
    const mockSetIcon = jest.fn();
    const mockMarker1 = { setIcon: mockSetIcon } as any;
    const mockMarker2 = { setIcon: mockSetIcon } as any;
    const markers = [mockMarker1, mockMarker2];
    const focusedMarker = mockMarker1;
    const mockMap = {} as any;

    focusMarker(focusedMarker, markers, mockMap);

    expect(mockSetIcon).toHaveBeenCalledTimes(3);
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(MarkerColor.RED);
    expect(getMarkerWithColorMock).toHaveBeenCalledWith(
      MarkerColor.DARKRED,
      'big'
    );
  });
});
