import * as qrcodeModule from 'qrcode-generator';

/** The two QR encoding modes this workspace uses. See {@link QrSegment}. */
export type QrMode = 'Byte' | 'Alphanumeric';

/** As much of `qrcode-generator` as this module touches. */
interface QrMatrix {
  addData(data: string, mode: QrMode): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
}

type QrFactory = (typeNumber: 0, errorCorrectionLevel: 'Q') => QrMatrix;

/**
 * The encoder, reached the same way from every build in this workspace.
 *
 * `qrcode-generator` is a UMD package declared with `export =`. The app build
 * bundles its ES module, where the factory is the default export; Jest loads
 * its CommonJS build, where the factory *is* `module.exports`; and the two
 * tsconfigs involved disagree about `esModuleInterop`, so no single import
 * form is both callable at runtime and accepted by the compiler in all four
 * combinations. Taking the default when there is one, and the namespace
 * itself when there is not, is correct under every one of them.
 *
 * The shape above is declared here rather than imported for the same reason:
 * the package's own types are ambient globals, which resolve differently under
 * the same two settings.
 */
const qrcode = ((qrcodeModule as unknown as { default?: unknown }).default ??
  qrcodeModule) as unknown as QrFactory;

/**
 * Error correction level `Q`: a quarter of the code can be lost and still read.
 *
 * `M` is the usual default and is chosen for codes on a screen. These are
 * printed and glued to a table or a window, where they collect a thumbprint, a
 * drip of sauce and the corner somebody picked at, so the margin that matters
 * is the one left after the code is damaged rather than the one that keeps it
 * small.
 */
export const QR_ERROR_CORRECTION = 'Q' as const;

/**
 * The white border around the code, in modules.
 *
 * Four is what ISO/IEC 18004 requires, and a scanner that cannot find the
 * finder patterns against a quiet background fails with no error message at
 * all - it simply never sees a code. Carried inside the `viewBox` rather than
 * left to CSS padding, so a caller that sizes the code cannot accidentally
 * crop the part of it that is not printed.
 */
export const QR_QUIET_ZONE_MODULES = 4;

/**
 * One run of characters encoded in one mode.
 *
 * A QR code can switch mode mid-payload, which is worth doing when part of a
 * URL is drawn from the alphanumeric set: two such characters cost 11 bits
 * against 16 in byte mode. The table codes of GitHub issue \#1087 are the case
 * this exists for - see `tableQrCode`.
 */
export interface QrSegment {
  text: string;
  mode: QrMode;
}

/** A rendered code: the geometry a caller needs and nothing about its size. */
export interface QrCode {
  /**
   * What the code encodes.
   *
   * Derived from the segments rather than passed in beside them, so the text
   * a sheet prints under a code cannot drift from what the code resolves to.
   * A printed disagreement is discovered on a sticker already glued to a
   * table.
   */
  url: string;
  /** Modules across, without the quiet zone. */
  moduleCount: number;
  /** `viewBox` covering the code and its quiet zone, in module units. */
  viewBox: string;
  /** One SVG path covering every dark module. */
  path: string;
}

/**
 * The dark modules of one row, as SVG path commands.
 *
 * Runs rather than one rectangle per module: a version 4 code holds about 550
 * dark modules, and 550 `<rect>` elements is a print job a browser visibly
 * struggles to lay out twenty-four times on one sheet. Consecutive dark
 * modules become one horizontal bar, which is also what keeps the printed
 * edges between them from showing as hairlines at high resolution.
 */
const rowPath = (
  isDark: (column: number) => boolean,
  row: number,
  moduleCount: number,
): string => {
  const commands: string[] = [];
  let start: number | null = null;

  // One past the last column, so a run reaching the right edge is closed by
  // the same branch that closes every other run.
  for (let column = 0; column <= moduleCount; column += 1) {
    const dark = column < moduleCount && isDark(column);

    if (dark && start === null) {
      start = column;
    } else if (!dark && start !== null) {
      commands.push(
        `M${start + QR_QUIET_ZONE_MODULES} ${
          row + QR_QUIET_ZONE_MODULES
        }h${column - start}v1h-${column - start}z`,
      );
      start = null;
    }
  }

  return commands.join('');
};

/**
 * The printable code for a URL.
 *
 * Pure, and drawn in module units, so the same result is rendered at whatever
 * millimetre size the layout asks for. The version is chosen by the encoder
 * rather than pinned, because a payload of another length must still produce a
 * readable code rather than a refusal at the printer.
 *
 * Takes either a whole URL - encoded as one byte segment, which is right for
 * an address nothing special is known about - or the segments to encode it as,
 * for a caller that knows part of its payload is alphanumeric.
 */
export const qrCode = (payload: string | readonly QrSegment[]): QrCode => {
  const segments: readonly QrSegment[] =
    typeof payload === 'string' ? [{ text: payload, mode: 'Byte' }] : payload;

  const code = qrcode(0, QR_ERROR_CORRECTION);

  for (const segment of segments) {
    code.addData(segment.text, segment.mode);
  }

  code.make();

  const moduleCount = code.getModuleCount();
  const side = moduleCount + QR_QUIET_ZONE_MODULES * 2;
  const path = Array.from({ length: moduleCount }, (_, row) =>
    rowPath((column) => code.isDark(row, column), row, moduleCount),
  ).join('');

  return {
    url: segments.map((segment) => segment.text).join(''),
    moduleCount,
    viewBox: `0 0 ${side} ${side}`,
    path,
  };
};
