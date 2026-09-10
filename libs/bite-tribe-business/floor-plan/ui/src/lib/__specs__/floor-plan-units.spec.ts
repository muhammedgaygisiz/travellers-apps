import {
  METRE_IN_MILLIMETRES,
  formatMetres,
  metresToMillimetres,
  millimetresToMetres,
} from '../floor-plan-units';

describe('floor plan units', () => {
  describe(metresToMillimetres.name, () => {
    it('converts the metres an owner types into millimetres', () => {
      expect(metresToMillimetres(8)).toBe(8000);
      expect(metresToMillimetres(12.5)).toBe(12_500);
    });

    it('rounds to a whole millimetre, because the model stores integers', () => {
      expect(metresToMillimetres(8.00006)).toBe(8000);
      expect(metresToMillimetres(0.0004)).toBe(0);
    });
  });

  describe(millimetresToMetres.name, () => {
    it('is the inverse for any value the form can produce', () => {
      [0.5, 1, 8, 12.34, 200].forEach((metres) => {
        expect(millimetresToMetres(metresToMillimetres(metres))).toBe(metres);
      });
    });
  });

  describe(formatMetres.name, () => {
    it('labels whole metres without a decimal point', () => {
      expect(formatMetres(METRE_IN_MILLIMETRES)).toBe('1 m');
      expect(formatMetres(10_000)).toBe('10 m');
    });

    it('labels a fraction of a metre without trailing zeroes', () => {
      expect(formatMetres(500)).toBe('0.5 m');
      expect(formatMetres(250)).toBe('0.25 m');
    });
  });
});
