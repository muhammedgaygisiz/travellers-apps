import { qrCode, type QrCode, type QrSegment } from 'common/ui/qr-code';
import { BITE_TRIBE_ORIGIN, PATH } from 'utils';

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
 * The consumer app now serves it: issue \#1101 mounted the scan screen on
 * `PATH.TABLE_SCAN`, which this is built from rather than spelled beside. Two
 * constants naming one printed URL is two constants that can disagree, and the
 * disagreement would be discovered on a sticker already glued to a table.
 */
export const TABLE_SCAN_PATH = `/${PATH.TABLE_SCAN}/`;

/** The full prefix every printed code carries, before the token. */
export const TABLE_SCAN_PREFIX = `${BITE_TRIBE_ORIGIN}${TABLE_SCAN_PATH}`;

/** The alphanumeric set QR encodes in 11 bits per two characters. */
const ALPHANUMERIC = /^[0-9A-Z $%*+\-./:]*$/;

/** A rendered table code. The geometry is the shared library's. */
export type TableQrCode = QrCode;

/** The URL a table's code resolves to. */
export const tableScanUrl = (token: string): string =>
  `${TABLE_SCAN_PREFIX}${token}`;

/**
 * The URL as two segments rather than one.
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
const urlSegments = (token: string): readonly QrSegment[] =>
  ALPHANUMERIC.test(token)
    ? [
        { text: TABLE_SCAN_PREFIX, mode: 'Byte' },
        { text: token, mode: 'Alphanumeric' },
      ]
    : [{ text: tableScanUrl(token), mode: 'Byte' }];

/**
 * The printable code for one table's token.
 *
 * Only the payload is this library's business. The encoder, the quiet zone and
 * the error correction level moved to `common/ui/qr-code` for issue \#370,
 * whose menu codes are printed by a restaurant that may have no floor plan and
 * no tables at all - and which must therefore not reach into this library to
 * draw one.
 */
export const tableQrCode = (token: string): TableQrCode =>
  qrCode(urlSegments(token));
