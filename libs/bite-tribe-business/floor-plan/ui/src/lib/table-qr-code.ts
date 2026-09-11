import * as qrcodeModule from 'qrcode-generator';
import { BITE_TRIBE_ORIGIN } from 'utils';

/** The two QR encoding modes a table code uses. See {@link addUrl}. */
type QrMode = 'Byte' | 'Alphanumeric';

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
 * The path a scanned table code lands on (GitHub issue \#1087).
 *
 * Two characters rather than a readable word, and that is a print decision
 * rather than a taste one: every character in the URL costs modules, every
 * module costs printed millimetres, and the acceptance criterion on this issue
 * is that the code scans from a seated distance. `/table/` would be six
 * characters longer for nothing a guest ever reads - the URL is behind a
 * camera, not in an address bar.
 *
 * Nothing serves it yet. [[UC - Order At The Table Through A QR Code]] mounts
 * the resolver here in issue \#1072, and this constant is what a sticker
 * printed today commits that issue to.
 */
export const TABLE_SCAN_PATH = '/t/';

/** The full prefix every printed code carries, before the token. */
export const TABLE_SCAN_PREFIX = `${BITE_TRIBE_ORIGIN}${TABLE_SCAN_PATH}`;

/**
 * Error correction level `Q`: a quarter of the code can be lost and still read.
 *
 * `M` is the usual default and is chosen for codes on a screen. This one is
 * glued to a restaurant table, where it collects a thumbprint, a drip of sauce
 * and the corner somebody picked at, so the margin that matters is the one
 * left after the code is damaged rather than the one that keeps it small.
 *
 * It costs nothing here in practice. The URL is 50 characters, which needs QR
 * version 4 at `M` and version 4 at `Q` as well once the token is encoded in
 * alphanumeric mode - the same 33x33 grid either way.
 */
export const TABLE_QR_ERROR_CORRECTION = 'Q' as const;

/**
 * The white border around the code, in modules.
 *
 * Four is what ISO/IEC 18004 requires, and a scanner that cannot find the
 * finder patterns against a quiet background fails with no error message at
 * all - it simply never sees a code. Carried inside the `viewBox` rather than
 * left to CSS padding, so a caller that sizes the code cannot accidentally
 * crop the part of it that is not printed.
 */
export const TABLE_QR_QUIET_ZONE_MODULES = 4;

/** The alphanumeric set QR encodes in 11 bits per two characters. */
const ALPHANUMERIC = /^[0-9A-Z $%*+\-./:]*$/;

/** A rendered code: the geometry a caller needs and nothing about its size. */
export interface TableQrCode {
  /** What the code encodes. Rendered beside it for support calls. */
  url: string;
  /** Modules across, without the quiet zone. */
  moduleCount: number;
  /** `viewBox` covering the code and its quiet zone, in module units. */
  viewBox: string;
  /** One SVG path covering every dark module. */
  path: string;
}

/** The URL a table's code resolves to. */
export const tableScanUrl = (token: string): string =>
  `${TABLE_SCAN_PREFIX}${token}`;

/**
 * Adds the URL as two segments rather than one.
 *
 * A QR code can switch mode mid-payload, and issue \#1086 drew the token in
 * Crockford base32 precisely so this is possible: 26 uppercase alphanumeric
 * characters cost 143 bits in alphanumeric mode against 208 in byte mode, so
 * splitting the URL at the token saves 52 bits after the second segment's own
 * 13-bit header. That is the difference between fitting error correction level
 * `Q` into QR version 4 and needing version 5 for it - one grid size, at the
 * printed sizes on the sheet about four millimetres of scan distance.
 *
 * The guard is the reason the split is safe to make unconditionally. A token
 * outside the alphanumeric set - a lower-case one, or anything issued by some
 * future generator - would throw inside the encoder rather than print wrong,
 * so it falls back to one byte segment and simply produces a larger code.
 */
const addUrl = (code: QrMatrix, token: string): void => {
  if (!ALPHANUMERIC.test(token)) {
    code.addData(tableScanUrl(token), 'Byte');

    return;
  }

  code.addData(TABLE_SCAN_PREFIX, 'Byte');
  code.addData(token, 'Alphanumeric');
};

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
        `M${start + TABLE_QR_QUIET_ZONE_MODULES} ${
          row + TABLE_QR_QUIET_ZONE_MODULES
        }h${column - start}v1h-${column - start}z`,
      );
      start = null;
    }
  }

  return commands.join('');
};

/**
 * The printable code for one table's token.
 *
 * Pure, and drawn in module units, so the same result is rendered at whatever
 * millimetre size the layout asks for. The version is chosen by the encoder
 * rather than pinned, because a token of another length must still produce a
 * readable code rather than a refusal at the printer.
 */
export const tableQrCode = (token: string): TableQrCode => {
  const code = qrcode(0, TABLE_QR_ERROR_CORRECTION);

  addUrl(code, token);
  code.make();

  const moduleCount = code.getModuleCount();
  const side = moduleCount + TABLE_QR_QUIET_ZONE_MODULES * 2;
  const path = Array.from({ length: moduleCount }, (_, row) =>
    rowPath((column) => code.isDark(row, column), row, moduleCount),
  ).join('');

  return {
    url: tableScanUrl(token),
    moduleCount,
    viewBox: `0 0 ${side} ${side}`,
    path,
  };
};
