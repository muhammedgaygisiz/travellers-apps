import { QR_QUIET_ZONE_MODULES, qrCode } from '../qr-code';

const URL = 'https://bitetribe.app/m/restaurant-1';

describe('qrCode', () => {
  it('encodes what it says it encodes', () => {
    expect(qrCode(URL).url).toBe(URL);
  });

  it('joins segments into the URL printed beside the code', () => {
    // The reason the payload decides the URL rather than being passed beside
    // it: a sheet prints this string under the code, and a disagreement
    // between the two is found on a sticker already glued to a table.
    expect(
      qrCode([
        { text: 'https://bitetribe.app/t/', mode: 'Byte' },
        { text: 'TOKEN', mode: 'Alphanumeric' },
      ]).url,
    ).toBe('https://bitetribe.app/t/TOKEN');
  });

  it('draws a code with modules in it', () => {
    const { moduleCount, path } = qrCode(URL);

    expect(moduleCount).toBeGreaterThan(0);
    expect(path).not.toBe('');
  });

  it('surrounds the code with the quiet zone the standard requires', () => {
    const { moduleCount, viewBox } = qrCode(URL);
    const side = moduleCount + QR_QUIET_ZONE_MODULES * 2;

    expect(viewBox).toBe(`0 0 ${side} ${side}`);
  });

  it('offsets every module by the quiet zone', () => {
    const firstMove = /^M(\d+) (\d+)/.exec(qrCode(URL).path);

    // The top-left finder pattern starts at module 0,0, so the first command
    // lands at the quiet zone itself - anything smaller would print part of
    // the code outside its own viewBox.
    expect(firstMove?.[1]).toBe(String(QR_QUIET_ZONE_MODULES));
    expect(firstMove?.[2]).toBe(String(QR_QUIET_ZONE_MODULES));
  });

  it('draws a run of dark modules as one bar', () => {
    // The top-left finder pattern's first row is seven dark modules, and a
    // path that emitted one command per module would be seven times longer
    // for every code on a page.
    expect(qrCode(URL).path).toContain(
      `M${QR_QUIET_ZONE_MODULES} ${QR_QUIET_ZONE_MODULES}h7v1h-7z`,
    );
  });

  it('gives two payloads two different codes', () => {
    expect(qrCode(URL).path).not.toBe(
      qrCode('https://bitetribe.app/m/restaurant-2').path,
    );
  });

  it('spends fewer modules on an alphanumeric segment than on bytes', () => {
    // Why segments exist at all. Same payload, same error correction, and the
    // only difference is that one half is declared alphanumeric.
    const split = qrCode([
      { text: 'https://bitetribe.app/t/', mode: 'Byte' },
      { text: 'TEST-TABLE-QR-TOKEN-000012', mode: 'Alphanumeric' },
    ]);
    const bytes = qrCode(
      'https://bitetribe.app/t/TEST-TABLE-QR-TOKEN-000012'.toLowerCase(),
    );

    expect(bytes.moduleCount).toBeGreaterThan(split.moduleCount);
  });
});
