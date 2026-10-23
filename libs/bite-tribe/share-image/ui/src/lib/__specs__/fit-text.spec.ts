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

  it('cuts a single word wider than the line', () => {
    const lines = wrapText(measurer, 'Donaudampfschifffahrtsschnitzel', 100, 2);

    lines.forEach((line) =>
      expect(measurer.measureText(line).width).toBeLessThanOrEqual(100),
    );
  });

  it('draws nothing for an empty name', () => {
    expect(wrapText(measurer, '   ', 100, 2)).toEqual([]);
  });
});
