import { foldSearchText } from '../fold-search-text';

describe('foldSearchText', () => {
  it.each([
    ['ラーメン', 'らーめん'],
    ['ラーメン', 'ﾗｰﾒﾝ'],
    ['らーめん', 'ﾗｰﾒﾝ'],
    ['ギョウザ', 'ｷﾞｮｳｻﾞ'],
    ['ぎょうざ', 'ｷﾞｮｳｻﾞ'],
    ['パン', 'ﾊﾟﾝ'],
    ['ゔ', 'ヴ'],
    ['いすゞ', 'イスヾ'],
    ['pizza', 'ＰＩＺＺＡ'],
    ['Pizza', 'ｐｉｚｚａ'],
  ])('folds %s and %s to one value', (left, right) => {
    expect(foldSearchText(left)).toBe(foldSearchText(right));
  });

  it('keeps kanji spellings apart from their kana reading', () => {
    expect(foldSearchText('ラーメン')).not.toContain(foldSearchText('拉麺'));
    expect(foldSearchText('拉麺')).toBe('拉麺');
  });

  it('leaves the other scripts as they were', () => {
    expect(foldSearchText('Café Müller')).toBe('café müller');
    expect(foldSearchText('한국어')).toBe('한국어');
    expect(foldSearchText('ไทย')).toBe('ไทย');
  });
});
