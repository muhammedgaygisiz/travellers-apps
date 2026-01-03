import { beforeEach, describe, expect, it } from 'vitest';
import { focusMarker } from '../focus-marker';
import { MarkerColor } from '../../model/marker-color.enum';
import { vi } from 'vitest';

const getMarkerWithColorMock = vi.fn();
vi.mock('../get-marker-with-color', () => ({
  getMarkerWithColor: (...args: any): void => getMarkerWithColorMock(...args),
}));

describe('focusMarker', () => {
  const mockSetIcon = vi.fn();
  const mockMarker1 = { setIcon: mockSetIcon, options: { alt: '2' } } as any;
  const mockMarker2 = { setIcon: mockSetIcon } as any;
  const mockMap = {} as any;
  const focusedMarker = mockMarker1;

  beforeEach(() => {
    mockSetIcon.mockClear();
    getMarkerWithColorMock.mockClear();
  });

  it('should do nothing if map is undefined', () => {
    const markers = [mockMarker1, mockMarker2];
    const mockMap = undefined as any;

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
