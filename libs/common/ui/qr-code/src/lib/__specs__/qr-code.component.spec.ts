import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { qrCode } from '../qr-code';
import { QrCodeComponent } from '../qr-code.component';

const URL = 'https://bitetribe.app/m/restaurant-1';
const OTHER_URL = 'https://bitetribe.app/m/restaurant-2';

describe(QrCodeComponent.name, () => {
  let fixture: ComponentFixture<QrCodeComponent>;
  let ref: ComponentRef<QrCodeComponent>;

  const svg = (): SVGSVGElement =>
    fixture.nativeElement.querySelector('[data-testid="qr-code"]');

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrCodeComponent);
    ref = fixture.componentRef;
    setInputs({ payload: URL });
  });

  it('draws the code of its payload', () => {
    const expected = qrCode(URL);

    expect(svg().getAttribute('viewBox')).toBe(expected.viewBox);
    expect(svg().querySelector('path')?.getAttribute('d')).toBe(expected.path);
  });

  it('draws the segments it is handed', () => {
    const segments = [
      { text: 'https://bitetribe.app/t/', mode: 'Byte' as const },
      { text: 'TOKEN', mode: 'Alphanumeric' as const },
    ];

    setInputs({ payload: segments });

    expect(svg().querySelector('path')?.getAttribute('d')).toBe(
      qrCode(segments).path,
    );
  });

  it('draws a code a caller already built', () => {
    // How a caller with its own URL rules stays out of this component: it
    // hands over geometry rather than teaching the renderer its domain.
    const built = qrCode(OTHER_URL);

    setInputs({ payload: built });

    expect(svg().querySelector('path')?.getAttribute('d')).toBe(built.path);
  });

  /**
   * The one component in the workspace that must ignore the theme. A scanner
   * needs a dark code on a light quiet zone, and a dark-mode inversion
   * produces a sheet that looks right on screen and scans as nothing at all.
   */
  it('paints literal black on white rather than theme colours', () => {
    expect(svg().querySelector('rect')?.getAttribute('fill')).toBe('#fff');
    expect(svg().querySelector('path')?.getAttribute('fill')).toBe('#000');
  });

  it('redraws when its payload changes', () => {
    const first = svg().querySelector('path')?.getAttribute('d');

    setInputs({ payload: OTHER_URL });

    expect(svg().querySelector('path')?.getAttribute('d')).not.toBe(first);
    expect(svg().querySelector('path')?.getAttribute('d')).toBe(
      qrCode(OTHER_URL).path,
    );
  });

  describe('what a screen reader is told', () => {
    /**
     * Presentational by default, which is right on a sheet: what the code
     * leads to is printed in text beside it, so announcing the image as well
     * would read it out twice.
     */
    it('is presentational while it carries no label', () => {
      expect(svg().getAttribute('role')).toBe('presentation');
      // Empty rather than absent, which names nothing either way.
      expect(svg().getAttribute('aria-label')).toBe('');
    });

    it('is an image named by its label when it is given one', () => {
      setInputs({ label: 'QR code for the menu' });

      expect(svg().getAttribute('role')).toBe('img');
      expect(svg().getAttribute('aria-label')).toBe('QR code for the menu');
    });
  });
});
