import {
  TABLE_QR_QUIET_ZONE_MODULES,
  TABLE_SCAN_PREFIX,
  tableQrCode,
  tableScanUrl,
} from '../table-qr-code';

/** A token of the shape issue \#1086 issues: 26 Crockford base32 characters. */
const TOKEN = '7K3QMXB2VZ0HNDR5TWY9FC8AJP';

describe('tableScanUrl', () => {
  it('puts the token on the public origin', () => {
    expect(tableScanUrl(TOKEN)).toBe(`https://bitetribe.app/t/${TOKEN}`);
  });

  it('is what the code encodes', () => {
    expect(tableQrCode(TOKEN).url).toBe(tableScanUrl(TOKEN));
  });
});

describe('tableQrCode', () => {
  it('fits the scan URL in QR version 4', () => {
    // 33 modules is version 4. The assertion is the printed size: the sheet
    // lays a sticker out for a code of this grid, and a larger one would scan
    // from further away at the cost of the layout no longer fitting A4.
    expect(tableQrCode(TOKEN).moduleCount).toBe(33);
  });

  it('encodes the token in alphanumeric mode rather than as bytes', () => {
    // Same payload, same error correction, and the only difference is that the
    // token is unsplittable. A byte-only code needs a bigger grid, which is the
    // saving issue #1086's alphabet was chosen for.
    const alphanumeric = tableQrCode(TOKEN);
    const bytes = tableQrCode(TOKEN.toLowerCase());

    expect(bytes.moduleCount).toBeGreaterThan(alphanumeric.moduleCount);
  });

  it('still renders a token outside the alphanumeric set', () => {
    const { path, moduleCount } = tableQrCode(TOKEN.toLowerCase());

    expect(moduleCount).toBeGreaterThan(0);
    expect(path).not.toBe('');
  });

  it('surrounds the code with the quiet zone the standard requires', () => {
    const { moduleCount, viewBox } = tableQrCode(TOKEN);
    const side = moduleCount + TABLE_QR_QUIET_ZONE_MODULES * 2;

    expect(viewBox).toBe(`0 0 ${side} ${side}`);
  });

  it('offsets every module by the quiet zone', () => {
    const { path } = tableQrCode(TOKEN);
    const firstMove = /^M(\d+) (\d+)/.exec(path);

    // The top-left finder pattern starts at module 0,0, so the first command
    // lands at the quiet zone itself - anything smaller would print part of
    // the code outside its own viewBox.
    expect(firstMove?.[1]).toBe(String(TABLE_QR_QUIET_ZONE_MODULES));
    expect(firstMove?.[2]).toBe(String(TABLE_QR_QUIET_ZONE_MODULES));
  });

  it('draws a run of dark modules as one bar', () => {
    // The top-left finder pattern's first row is seven dark modules, and a
    // path that emitted one command per module would be seven times longer for
    // twenty-four codes on a page.
    expect(tableQrCode(TOKEN).path).toContain(
      `M${TABLE_QR_QUIET_ZONE_MODULES} ${TABLE_QR_QUIET_ZONE_MODULES}h7v1h-7z`,
    );
  });

  it('gives two tables two different codes', () => {
    expect(tableQrCode(TOKEN).path).not.toBe(
      tableQrCode('QZ5V8T2W7YRNJ0HDBM3XKC9FPA').path,
    );
  });

  it('names the origin the consumer app is canonicalised to', () => {
    expect(TABLE_SCAN_PREFIX).toBe('https://bitetribe.app/t/');
  });
});
