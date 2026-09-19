import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { qrCode, type QrCode, type QrSegment } from './qr-code';

/**
 * A QR code, drawn as inline SVG (GitHub issues \#1087 and \#370).
 *
 * Inline SVG rather than a data URL in an `<img>`, for three print reasons.
 * A vector code rasterises at the printer's own resolution instead of the
 * screen's, so the module edges land on device pixels and the code stays
 * square at any size. An inline element is laid out before `window.print()`
 * returns, where an image may still be decoding when the print dialog reads
 * the page. And a browser printing with "background graphics" off drops an
 * image's background and keeps an SVG `fill`, which is the difference between
 * a printed code and a printed blank.
 *
 * The colours are literal black and white rather than Ionic variables. This is
 * the one component in the workspace that must ignore the theme: a scanner
 * needs a dark code on a light quiet zone, and a dark-mode inversion produces
 * a sheet that looks right on screen and scans as nothing at all.
 */
@Component({
  selector: 'bt-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="code().viewBox"
      [attr.aria-label]="label()"
      [attr.role]="label() ? 'img' : 'presentation'"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="crispEdges"
      data-testid="qr-code"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path [attr.d]="code().path" fill="#000" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;

      /* Keeps the quiet zone white when a browser is set to print without
       * background graphics. The rule applies to the element's own painting,
       * so it survives into the print job rather than being a screen-only
       * hint. */
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  `,
})
export class QrCodeComponent {
  /**
   * What to encode: a URL, the segments to encode it as, or a code a caller
   * already built.
   *
   * The third form is what lets a caller with its own URL rules - the table
   * codes, which split their payload at the token - hand over geometry rather
   * than teach this component about its domain.
   */
  readonly payload = input.required<string | readonly QrSegment[] | QrCode>();

  /**
   * What a screen reader announces. Empty makes the code presentational, which
   * is right on a sheet that already names in text what the code leads to.
   */
  readonly label = input('');

  protected readonly code = computed<QrCode>(() => {
    const payload = this.payload();

    return typeof payload === 'string' || Array.isArray(payload)
      ? qrCode(payload as string | readonly QrSegment[])
      : (payload as QrCode);
  });
}
