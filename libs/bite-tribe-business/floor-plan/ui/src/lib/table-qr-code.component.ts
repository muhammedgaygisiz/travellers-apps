import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { QrCodeComponent } from 'common/ui/qr-code';
import { tableQrCode } from './table-qr-code';

/**
 * One table's QR code (GitHub issue \#1087).
 *
 * A wrapper rather than a renderer since issue \#370: the drawing, the quiet
 * zone and every print decision behind them are `bt-qr-code` in
 * `common/ui/qr-code`, and what is left here is the one thing that is about
 * tables - turning a token into the payload a scan resolves.
 *
 * It stays as a component because its callers pass a token. A sheet laying out
 * twenty-four stickers should not each compute a code on its way into a
 * template.
 */
@Component({
  selector: 'bt-business-table-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QrCodeComponent],
  // The test id sits on the wrapper rather than on the SVG inside it. A sheet
  // counts printed codes, and counting them by the element that means "one
  // table's code" survives the renderer being shared with every other code in
  // the workspace.
  host: { 'data-testid': 'table-qr-code' },
  template: `<bt-qr-code [payload]="code()" [label]="label()" />`,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class TableQrCodeComponent {
  /** The opaque token from `/tableTokens`, not the table's number. */
  readonly token = input.required<string>();

  /**
   * What a screen reader announces. Empty makes the code presentational, which
   * is right on a sheet that already names the table in text beside it.
   */
  readonly label = input('');

  protected readonly code = computed(() => tableQrCode(this.token()));
}
