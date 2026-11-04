/**
 * The part of the 2D context text fitting needs. Narrowed so that the fitting
 * can be tested without a canvas, which jsdom does not have.
 */
export type TextMeasurer = Pick<CanvasRenderingContext2D, 'measureText'>;

const ELLIPSIS = '…';

const fits = (ctx: TextMeasurer, text: string, maxWidth: number): boolean =>
  ctx.measureText(text).width <= maxWidth;

/**
 * `text` cut into its words or into its visible characters. `Intl.Segmenter`
 * knows where words end in scripts written without spaces, and keeps a Thai
 * vowel on its consonant. Without it, every code point stands alone.
 */
const segmentsOf = (
  text: string,
  granularity: Intl.SegmenterOptions['granularity'],
): string[] =>
  typeof Intl.Segmenter === 'function'
    ? Array.from(
        new Intl.Segmenter(undefined, { granularity }).segment(text),
        ({ segment }) => segment,
      )
    : Array.from(text);

/**
 * `word` as the pieces a line may break between: the word whole when it fits,
 * otherwise its dictionary words, and the characters of any that are still too
 * wide.
 */
const splitToFit = (
  ctx: TextMeasurer,
  word: string,
  maxWidth: number,
): string[] =>
  fits(ctx, word, maxWidth)
    ? [word]
    : segmentsOf(word, 'word').flatMap((segment) =>
        fits(ctx, segment, maxWidth)
          ? [segment]
          : segmentsOf(segment, 'grapheme'),
      );

/**
 * The longest prefix of `text` that fits `maxWidth` with an ellipsis after it,
 * or `text` itself when it fits whole. Dish and restaurant names are user
 * content of any length, and a share image must never be cut off at its edge.
 */
export const fitText = (
  ctx: TextMeasurer,
  text: string,
  maxWidth: number,
): string => {
  if (fits(ctx, text, maxWidth)) {
    return text;
  }

  const characters = segmentsOf(text, 'grapheme');
  let low = 0;
  let high = characters.length;

  // The longest prefix that still fits with the ellipsis, by bisection: a
  // prefix fitting means every shorter one does too.
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = characters.slice(0, middle).join('').trimEnd() + ELLIPSIS;

    if (fits(ctx, candidate, maxWidth)) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return characters.slice(0, low).join('').trimEnd() + ELLIPSIS;
};

/**
 * `text` broken into at most `maxLines` lines no wider than `maxWidth`. Lines
 * break between words. A word too long for a line on its own continues on the
 * next one, which is the normal case for Japanese and Thai: they write a whole
 * name without a space. Whatever is left over after the last line is cut with an
 * ellipsis.
 */
export const wrapText = (
  ctx: TextMeasurer,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const units = text
    .trim()
    .split(/\s+/)
    .filter((word) => !!word)
    .flatMap((word, wordIndex) =>
      splitToFit(ctx, word, maxWidth).map((unit, unitIndex) =>
        wordIndex > 0 && unitIndex === 0 ? ` ${unit}` : unit,
      ),
    );
  const lines: string[] = [];
  let index = 0;

  while (index < units.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      lines.push(fitText(ctx, units.slice(index).join('').trim(), maxWidth));
      break;
    }

    let line = units[index].trim();
    index += 1;

    while (index < units.length && fits(ctx, line + units[index], maxWidth)) {
      line += units[index];
      index += 1;
    }

    lines.push(fitText(ctx, line, maxWidth));
  }

  return lines;
};
