import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { IonButton, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { QrCodeComponent } from 'common/ui/qr-code';
import { linkOrigin, PATH } from 'utils';
import { MenuStickerComponent } from '../menu-sticker/menu-sticker.component';

/**
 * What a print button puts on paper: the bare code (#370), the door sticker or
 * the table tent (#2273).
 */
export type MenuPrintFormat = 'code' | 'door' | 'tent';

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
  imports: [
    IonButton,
    IonText,
    TranslocoPipe,
    QrCodeComponent,
    MenuStickerComponent,
  ],
  templateUrl: 'menu-qr.component.html',
  styleUrl: 'menu-qr.component.scss',
})
export class MenuQrComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

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

  /** On QA it names the QA site, so a QA code opens QA (#2304). */
  protected readonly url = computed(
    () => `${linkOrigin()}/${PATH.PUBLIC_MENU}/${this.restaurantId()}`,
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

  /**
   * Prints one format and nothing else.
   *
   * The host carries the format as `data-print` while the job runs, and the
   * print stylesheets keep only that format. It is set on the element directly
   * rather than through a binding because `window.print()` lays the page out
   * at once, before Angular would have rendered a changed signal. Without the
   * attribute - the browser's own print command - the plain code prints, as it
   * always has.
   */
  protected print(format: MenuPrintFormat): void {
    const host = this.host.nativeElement;

    host.dataset['print'] = format;
    window.addEventListener('afterprint', () => delete host.dataset['print'], {
      once: true,
    });
    window.print();
  }
}
