import { dishNameKey } from '../dish-name-key';

/** The key a Bite's dish is matched to a menu item by (GitHub issue #2216). */
describe(dishNameKey.name, () => {
  it.each([
    ['Margherita', '  margherita '],
    ['Crème brûlée', 'creme brulee'],
    ['Fish & Chips', 'fish and chips'],
    ['Pad Thai!', 'pad   thai'],
  ])('matches %p and %p', (left, right) => {
    expect(dishNameKey(left)).toBe(dishNameKey(right));
  });

  it('tells different dishes apart', () => {
    expect(dishNameKey('Carbonara')).not.toBe(
      dishNameKey('Spaghetti alla carbonara'),
    );
  });

  it('keeps names in a non-latin script apart rather than empty', () => {
    expect(dishNameKey('カレー')).toBe('カレー');
    expect(dishNameKey('カレー')).not.toBe(dishNameKey('ラーメン'));
  });
});
