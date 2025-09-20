import { getMarkerWithColor } from '../get-marker-with-color';
import { MarkerColor } from '../../model/marker-color.enum';

describe('getMarkerWithColor', () => {
  it('should return a DivIcon with the specified color', () => {
    const icon = getMarkerWithColor(MarkerColor.DARKRED);

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain(
      `background-color: ${MarkerColor.DARKRED}`
    );
    expect(icon.options.iconAnchor).toEqual([0, 35]);
    expect(icon.options.popupAnchor).toEqual([0, -36]);
  });

  it('should return a DivIcon with default color when no color is provided', () => {
    const icon = getMarkerWithColor(null as any);

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain(`background-color: ${MarkerColor.RED}`); // Default to red
  });
});
