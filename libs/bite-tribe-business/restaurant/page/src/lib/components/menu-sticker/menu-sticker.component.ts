import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { QrCodeComponent } from 'common/ui/qr-code';
import { linkOrigin } from 'utils';

/** The two printed layouts a restaurant can put its menu code on. */
export type MenuStickerFormat = 'door' | 'tent';

/**
 * The hosting route that opens the right store for the reader's phone
 * (GitHub issue #1628). It is a hosting rewrite, not an app route, so it is not
 * in `PATH`.
 */
const DOWNLOAD_PATH = 'download';

/**
 * The menu code laid out as something an owner glues to a door or stands on a
 * table (GitHub issue #2273).
 *
 * `bt-business-menu-qr` draws a bare code. This adds the BiteTribe mark, the
 * restaurant's name, a call to action and where to get the app, at the size
 * it is printed at:
 *
 * - `door`: a square sticker, 10 x 10 cm.
 * - `tent`: an A6 card folded across the middle. Both faces are the same and
 *   the lower one is turned upside down, so once folded it reads right side up
 *   from either side of the table.
 *
 * ## One drawing for the screen and the paper
 *
 * The preview the owner sees is the element that is printed. Every size inside
 * it is in `cqw`, a hundredth of the sticker's width, so the preview is the
 * printout scaled down: on paper the door sticker is 100 mm wide and `1cqw` is
 * a millimetre. Nothing has to be laid out twice, and the images are already
 * loaded by the time the print dialog opens.
 *
 * ## Why the colours are fixed
 *
 * It is paper. A dark theme on the owner's phone says nothing about the door
 * it is glued to, and an inverted code scans as nothing at all.
 *
 * ## One download line, no second code
 *
 * `bitetribe.app/download` opens the right store for the reader's phone, and
 * the menu page the code opens already offers the app. A second code would make
 * the sticker busier for no reader the first one misses.
 */
@Component({
  selector: 'bt-business-menu-sticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TranslocoPipe, QrCodeComponent],
  templateUrl: 'menu-sticker.component.html',
  styleUrl: 'menu-sticker.component.scss',
  host: { '[attr.data-format]': 'format()' },
})
export class MenuStickerComponent {
  readonly format = input.required<MenuStickerFormat>();

  /** The public menu address the code encodes. */
  readonly url = input.required<string>();

  /** Printed above the code; left out while the restaurant is still loading. */
  readonly restaurantName = input('');

  /**
   * Printed without its scheme, because it is read off a door and typed. On QA
   * it names the QA site, like the code beside it (#2304).
   */
  protected readonly downloadAddress = computed(
    () => `${linkOrigin().replace(/^https:\/\//, '')}/${DOWNLOAD_PATH}`,
  );
}
