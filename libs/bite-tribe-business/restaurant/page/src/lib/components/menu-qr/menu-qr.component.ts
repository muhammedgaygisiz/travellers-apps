import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { IonButton, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { QrCodeComponent } from 'common/ui/qr-code';
import { BITE_TRIBE_ORIGIN, PATH } from 'utils';

/** How long the copy button reports that it copied, in milliseconds. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * The code a restaurant prints so anybody can read its menu
 * (GitHub issue #370).
 *
 * ## Why this is not beside the table codes
 *
 * The table codes of issue #1087 are printed from the floor plan, one per
 * table, and each carries a token that scopes a *table*. This one carries the
 * restaurant and nothing else, which is the whole point: a restaurant that
 * wants its menu behind a sticker in the window has no rooms, no tables and no
 * ordering configured, and must not have to draw a floor plan to get one. It
 * therefore lives on the restaurant's own page, and draws its code with
 * `bt-qr-code` from `common/ui/qr-code` rather than reaching into the
 * floor-plan library.
 *
 * ## Both a code and a line of text
 *
 * The code is for print - a window sticker, a menu card, a table tent at a
 * restaurant that does not take orders. The address beside it is for
 * everything a camera is not pointed at: an Instagram bio, a Google listing, a
 * restaurant's own website. Publishing a menu should not require owning a
 * printer.
 */
@Component({
  selector: 'bt-business-menu-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonText, TranslocoPipe, QrCodeComponent],
  templateUrl: 'menu-qr.component.html',
  styleUrl: 'menu-qr.component.scss',
})
export class MenuQrComponent {
  readonly restaurantId = input.required<string>();

  /** Named in the code's accessible label, and printed under it. */
  readonly restaurantName = input('');

  /**
   * Whether this restaurant has a menu to publish.
   *
   * A code for a restaurant with no menu resolves to the public page's
   * `menuMissing` refusal, which is an honest answer to a scan and a poor
   * thing to have printed and glued to a window. So the block says what is
   * missing instead of drawing a code nobody should print yet.
   */
  readonly hasMenu = input(false);

  protected readonly copied = signal(false);

  protected readonly url = computed(
    () => `${BITE_TRIBE_ORIGIN}/${PATH.PUBLIC_MENU}/${this.restaurantId()}`,
  );

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), COPIED_FEEDBACK_MS);
    } catch {
      // A browser that refuses the clipboard - an insecure origin, or a
      // permission the owner declined - leaves the address on screen to be
      // selected by hand. Reporting a failure here would be reporting that the
      // thing they can plainly see is not there.
    }
  }

  protected print(): void {
    window.print();
  }
}
