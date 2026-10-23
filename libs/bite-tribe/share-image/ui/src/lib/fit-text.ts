/**
 * The part of the 2D context text fitting needs. Narrowed so that the fitting
 * can be tested without a canvas, which jsdom does not have.
 */
export type TextMeasurer = Pick<CanvasRenderingContext2D, 'measureText'>;

const ELLIPSIS = '…';

const fits = (ctx: TextMeasurer, text: string, maxWidth: number): boolean =>
  ctx.measureText(text).width <= maxWidth;

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

  const characters = Array.from(text);
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
 * break between words; a word too long for a line on its own, and whatever is
 * left over after the last line, are cut with an ellipsis.
 */
export const wrapText = (
  ctx: TextMeasurer,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => !!word);
  const lines: string[] = [];
  let index = 0;

  while (index < words.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      lines.push(fitText(ctx, words.slice(index).join(' '), maxWidth));
      break;
    }

    let line = words[index];
    index += 1;

    while (
      index < words.length &&
      fits(ctx, `${line} ${words[index]}`, maxWidth)
    ) {
      line = `${line} ${words[index]}`;
      index += 1;
    }

    lines.push(fitText(ctx, line, maxWidth));
  }

  return lines;
};
