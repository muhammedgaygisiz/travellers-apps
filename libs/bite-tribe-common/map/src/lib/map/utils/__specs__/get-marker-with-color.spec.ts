import { getMarkerWithColor } from '../get-marker-with-color';
import { MarkerColor } from '../../model/marker-color.enum';

describe('getMarkerWithColor', () => {
  it('should return a DivIcon with the specified color', () => {
    const icon = getMarkerWithColor(MarkerColor.DARKRED);

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain(
      `background-color: ${MarkerColor.DARKRED}`
    );
    expect(icon.options.iconAnchor).toEqual([-4, 25]);
  });

  it('should return a DivIcon with default color when no color is provided', () => {
    const icon = getMarkerWithColor(null as any);

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain(`background-color: ${MarkerColor.RED}`); // Default to red
  });

  it('should return a DivIcon with the specified size', () => {
    const icon = getMarkerWithColor(MarkerColor.DARKRED, { size: 'big' });

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain(
      `background-color: ${MarkerColor.DARKRED}`
    );
    expect(icon.options.iconAnchor).toEqual([0, 35]);
  });

  it('should return a DivIcon with small size by default', () => {
    const icon = getMarkerWithColor(MarkerColor.RED);

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain(`background-color: ${MarkerColor.RED}`);
    expect(icon.options.iconAnchor).toEqual([-4, 25]);
  });

  it('should include rating in the DivIcon when provided', () => {
    const icon = getMarkerWithColor(MarkerColor.RED, { rating: '5' });

    expect(icon).toBeDefined();
    expect(icon.options.html).toContain('5 <ion-icon name="star"/>');
  });
});
