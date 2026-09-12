import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { tableQrCode } from '../table-qr-code';
import { TableQrCodeComponent } from '../table-qr-code.component';

/**
 * The length a real token has, and deliberately nothing else about one.
 *
 * `generateTableQrToken` draws 26 characters of Crockford base32 at random,
 * and a fixture that looked like that is a fixture the repository's secret
 * scanner reports as a leaked credential - correct behaviour from the scanner,
 * and a false alarm every reviewer afterwards has to dismiss. What matters
 * here is that the payload is 26 alphanumeric characters, because that is what
 * decides the QR version the printed code comes out at. The same choice issue
 * \#1086 made for the rules spec's `/tableTokens` seeds.
 */
const TOKEN = 'TEST-TABLE-QR-TOKEN-000012';
const OTHER_TOKEN = 'TEST-TABLE-QR-TOKEN-000013';

describe(TableQrCodeComponent.name, () => {
  let fixture: ComponentFixture<TableQrCodeComponent>;
  let ref: ComponentRef<TableQrCodeComponent>;

  const svg = (): SVGSVGElement =>
    fixture.nativeElement.querySelector('[data-testid="table-qr-code"]');

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableQrCodeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableQrCodeComponent);
    ref = fixture.componentRef;
    setInputs({ token: TOKEN });
  });

  it('draws the code of its token', () => {
    const expected = tableQrCode(TOKEN);

    expect(svg().getAttribute('viewBox')).toBe(expected.viewBox);
    expect(svg().querySelector('path')?.getAttribute('d')).toBe(expected.path);
  });

  /**
   * The one component in the app that must ignore the theme. A scanner needs a
   * dark code on a light quiet zone, and a dark-mode inversion produces a
   * sheet that looks right on screen and scans as nothing at all.
   */
  it('paints literal black on white rather than theme colours', () => {
    expect(svg().querySelector('rect')?.getAttribute('fill')).toBe('#fff');
    expect(svg().querySelector('path')?.getAttribute('fill')).toBe('#000');
  });

  it('redraws when the table it belongs to changes', () => {
    const first = svg().querySelector('path')?.getAttribute('d');

    setInputs({ token: OTHER_TOKEN });

    expect(svg().querySelector('path')?.getAttribute('d')).not.toBe(first);
    expect(svg().querySelector('path')?.getAttribute('d')).toBe(
      tableQrCode(OTHER_TOKEN).path,
    );
  });

  describe('what a screen reader is told', () => {
    /**
     * Presentational by default, which is right on the sheet: the table
     * number, the room and the restaurant are printed in text beside the code,
     * so announcing the image as well would read the table out twice.
     */
    it('is presentational while it carries no label', () => {
      expect(svg().getAttribute('role')).toBe('presentation');
      // Empty rather than absent, which names nothing either way.
      expect(svg().getAttribute('aria-label')).toBe('');
    });

    it('is an image named by its label when it is given one', () => {
      setInputs({ label: 'QR code for table 12' });

      expect(svg().getAttribute('role')).toBe('img');
      expect(svg().getAttribute('aria-label')).toBe('QR code for table 12');
    });
  });
});
