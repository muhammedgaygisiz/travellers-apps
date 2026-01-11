import { isSimilar } from '../is-similar';

describe('isSimilar', () => {
  it('should return true for similar names', () => {
    const name1 = 'Chocolate Cake';
    const name2 = 'chocolate cake ';
    expect(isSimilar(name1, name2)).toBe(true);
  });

  it('should return false for dissimilar names', () => {
    const name1 = 'Vanilla Ice Cream';
    const name2 = 'Strawberry Ice Cream';
    expect(isSimilar(name1, name2)).toBe(false);
  });

  it('should return false for completely different names', () => {
    const name1 = 'Apple Pie';
    const name2 = 'Banana Bread';
    expect(isSimilar(name1, name2)).toBe(false);
  });

  it('should return true for names with minor typos', () => {
    const name1 = 'Pasta Carbonara';
    const name2 = 'Pasta Carbonar';
    expect(isSimilar(name1, name2)).toBe(true);
  });
});
