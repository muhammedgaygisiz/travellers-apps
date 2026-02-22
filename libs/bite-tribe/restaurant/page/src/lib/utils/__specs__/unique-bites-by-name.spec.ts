import { uniqueBitesByName } from '../unique-bites-by-name';

describe('uniqueBitesByName', () => {
  it('should return unique bites by name', () => {
    const bites = [
      { name: 'Bite 1', price: 10 },
      { name: 'Bite 2', price: 20 },
      { name: 'Bite 1', price: 15 },
      { name: 'Bite 3', price: 30 },
      { name: 'Bite 2', price: 25 },
    ];
    const uniqueBites = uniqueBitesByName(bites as any);
    expect(uniqueBites.length).toBe(3);
    expect(uniqueBites).toEqual([
      { name: 'Bite 1', price: 10 },
      { name: 'Bite 2', price: 20 },
      { name: 'Bite 3', price: 30 },
    ]);
  });

  it('should return an empty array when given an empty array', () => {
    const bites: any[] = [];
    const uniqueBites = uniqueBitesByName(bites);
    expect(uniqueBites.length).toBe(0);
    expect(uniqueBites).toEqual([]);
  });

  it('should return the same array when all bites are unique', () => {
    const bites = [
      { name: 'Bite 1', price: 10 },
      { name: 'Bite 2', price: 20 },
      { name: 'Bite 3', price: 30 },
    ];
    const uniqueBites = uniqueBitesByName(bites as any);
    expect(uniqueBites.length).toBe(3);
    expect(uniqueBites).toEqual(bites);
  });

  describe('given two bites with same name but one has a typo', () => {
    it('should return one bite', () => {
      const bites = [
        { name: 'Chicken', price: 10 },
        { name: 'chicken', price: 20 },
      ];
      const uniqueBites = uniqueBitesByName(bites as any);
      expect(uniqueBites.length).toBe(1);
      // This is a lack in the conception of the dynamic menu. We have to give further thoughts which price should be shown.
      // The latest or a range of prices. For now, we will just show the first one.
      expect(uniqueBites).toEqual([{ name: 'Chicken', price: 10 }]);
    });
  });
});
