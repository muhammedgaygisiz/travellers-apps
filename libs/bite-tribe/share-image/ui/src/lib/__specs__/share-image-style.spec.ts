import {
  contrastRatio,
  DEFAULT_SHARE_IMAGE_STYLE,
  legibleTextColours,
  MIN_TEXT_CONTRAST,
  SHARE_IMAGE_BACKGROUNDS,
  SHARE_IMAGE_TEXT_COLOURS,
  textColourById,
  withAlpha,
  withLegibleText,
} from '../share-image-style';

describe(contrastRatio.name, () => {
  it('rates black on white at 21:1 and a colour on itself at 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#1A1C22', '#1A1C22')).toBeCloseTo(1, 5);
  });
});

/** UC-SBS R-33 and the wordmark's 4.5:1 of issue #1731. */
describe('the colours offered', () => {
  it.each(SHARE_IMAGE_BACKGROUNDS.map((background) => background.id))(
    'offer at least two text colours on %s',
    (backgroundId) => {
      expect(legibleTextColours(backgroundId).length).toBeGreaterThanOrEqual(2);
    },
  );

  it.each(
    SHARE_IMAGE_BACKGROUNDS.flatMap((background) =>
      legibleTextColours(background.id).map(
        (text) => [background, text] as const,
      ),
    ),
  )('reach 4.5:1 against both ends of %o in %s', (background, textId) => {
    const { color } = textColourById(textId);

    background.stops.forEach((stop) =>
      expect(contrastRatio(color, stop)).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      ),
    );
  });

  it('offers every text colour on at least one background', () => {
    const offered = new Set(
      SHARE_IMAGE_BACKGROUNDS.flatMap((background) =>
        legibleTextColours(background.id),
      ),
    );

    expect([...offered].sort()).toEqual(
      SHARE_IMAGE_TEXT_COLOURS.map((colour) => colour.id).sort(),
    );
  });

  it('starts on a legible pair', () => {
    expect(withLegibleText(DEFAULT_SHARE_IMAGE_STYLE)).toEqual(
      DEFAULT_SHARE_IMAGE_STYLE,
    );
  });
});

describe(withLegibleText.name, () => {
  it('keeps a text colour that is legible on the new background', () => {
    expect(
      withLegibleText({ layout: 'bold', background: 'ocean', text: 'honey' }),
    ).toEqual({ layout: 'bold', background: 'ocean', text: 'honey' });
  });

  it('switches to the first legible text colour when the current one is not', () => {
    expect(
      withLegibleText({
        layout: 'classic',
        background: 'paper',
        text: 'white',
      }),
    ).toEqual({ layout: 'classic', background: 'paper', text: 'ink' });
  });
});

describe(withAlpha.name, () => {
  it('turns a hex colour into the same colour at an opacity', () => {
    expect(withAlpha('#FFFFFF', 0.72)).toBe('rgba(255, 255, 255, 0.72)');
  });
});
