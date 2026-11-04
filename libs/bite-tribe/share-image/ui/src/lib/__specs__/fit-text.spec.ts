import { fitText, wrapText, type TextMeasurer } from '../fit-text';

/** Every character is ten pixels wide. */
const measurer: TextMeasurer = {
  measureText: (text: string) =>
    ({ width: Array.from(text).length * 10 }) as TextMetrics,
};

describe(fitText.name, () => {
  it('leaves text that fits alone', () => {
    expect(fitText(measurer, 'Pho', 100)).toBe('Pho');
  });

  it('cuts text that does not fit and ends it with an ellipsis', () => {
    const fitted = fitText(measurer, 'Spaghetti alle vongole', 100);

    expect(fitted).toBe('Spaghetti…');
    expect(measurer.measureText(fitted).width).toBeLessThanOrEqual(100);
  });

  it('does not leave a space before the ellipsis', () => {
    expect(fitText(measurer, 'Bun bo hue', 50)).toBe('Bun…');
  });
});

describe(wrapText.name, () => {
  it('keeps a short name on one line', () => {
    expect(wrapText(measurer, 'Pad thai', 200, 2)).toEqual(['Pad thai']);
  });

  it('breaks between words', () => {
    expect(wrapText(measurer, 'Khao soi gai with lime', 120, 2)).toEqual([
      'Khao soi gai',
      'with lime',
    ]);
  });

  it('cuts what does not fit on the last line with an ellipsis', () => {
    const lines = wrapText(
      measurer,
      'The longest dish name anyone has ever typed into BiteTribe',
      120,
      2,
    );

    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    lines.forEach((line) =>
      expect(measurer.measureText(line).width).toBeLessThanOrEqual(120),
    );
  });

  it('continues a single word wider than the line on the next one', () => {
    const lines = wrapText(measurer, 'Donaudampfschifffahrtsschnitzel', 100, 2);

    expect(lines).toEqual(['Donaudampf', 'schifffah…']);
  });

  it('keeps a word that fits whole rather than breaking at its hyphen', () => {
    expect(wrapText(measurer, 'Bun-bo-hue pork', 100, 2)).toEqual([
      'Bun-bo-hue',
      'pork',
    ]);
  });

  describe('text with no spaces', () => {
    const japanese = '特製味噌チャーシュー麺大盛り';
    const thai = 'ก๋วยเตี๋ยวเรือหมูน้ำตกรสเด็ด';

    const expectWithinWidth = (lines: string[], maxWidth: number): void =>
      lines.forEach((line) =>
        expect(measurer.measureText(line).width).toBeLessThanOrEqual(maxWidth),
      );

    it('wraps Japanese across its lines without losing a character', () => {
      const lines = wrapText(measurer, japanese, 80, 3);

      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join('')).toBe(japanese);
      expectWithinWidth(lines, 80);
    });

    it('breaks Japanese between words where it can', () => {
      expect(wrapText(measurer, japanese, 80, 3)).toEqual([
        '特製味噌',
        'チャーシュー麺',
        '大盛り',
      ]);
    });

    it('cuts Japanese with an ellipsis on the last line', () => {
      const lines = wrapText(measurer, japanese, 60, 2);

      expect(lines).toHaveLength(2);
      expect(lines[1].endsWith('…')).toBe(true);
      expectWithinWidth(lines, 60);
    });

    it('wraps Thai across its lines without losing a character', () => {
      const lines = wrapText(measurer, thai, 120, 3);

      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join('')).toBe(thai);
      expectWithinWidth(lines, 120);
    });

    it('starts no Thai line with a vowel or tone mark', () => {
      wrapText(measurer, thai, 70, 6).forEach((line) =>
        expect(line).not.toMatch(/^\p{M}/u),
      );
    });

    describe('without Intl.Segmenter', () => {
      const intl = Intl as { Segmenter?: unknown };
      const segmenter = intl.Segmenter;

      beforeEach(() => {
        intl.Segmenter = undefined;
      });

      afterEach(() => {
        intl.Segmenter = segmenter;
      });

      it('wraps per character', () => {
        expect(wrapText(measurer, 'ラーメンギョウザ', 40, 2)).toEqual([
          'ラーメン',
          'ギョウザ',
        ]);
      });

      it('still cuts the last line with an ellipsis', () => {
        expect(wrapText(measurer, 'ラーメンギョウザ定食', 40, 2)).toEqual([
          'ラーメン',
          'ギョウ…',
        ]);
      });
    });
  });

  it('draws nothing for an empty name', () => {
    expect(wrapText(measurer, '   ', 100, 2)).toEqual([]);
  });
});
