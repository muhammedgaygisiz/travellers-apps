import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { GetImagePipe } from 'bite-tribe-common/bite';
import type { Bite, MenuItem } from 'model';

/**
 * What people said about one dish (GitHub issue #1113).
 *
 * ## Why a modal and not a route
 *
 * The guest is deciding what to order. A route would take the menu off the
 * screen and put them back at the top of it afterwards, which is the thing
 * that stops people looking at the second dish - and there is nothing here
 * worth a URL: the Bites are already addressable one by one, and this is a
 * glance at several.
 *
 * ## What a row shows, and what it leaves out
 *
 * The photo, the rating and the comment. Not the author, not the likes, and
 * nothing to tap through to: somebody reading this is choosing between two
 * pizzas, and every affordance is a way out of that decision. The full Bite
 * has its own page for anyone who wants it.
 */
@Component({
  selector: 'bt-dish-bites',
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonSpinner,
    TranslocoPipe,
    GetImagePipe,
  ],
  templateUrl: './dish-bites.component.html',
  styleUrl: './dish-bites.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishBitesComponent {
  /** The dish whose Bites are open, or nothing. */
  readonly dish = input<MenuItem | undefined>(undefined);

  readonly bites = input<Bite[]>([]);
  readonly loading = input(false);

  readonly closed = output<void>();

  protected readonly isOpen = computed(() => this.dish() !== undefined);

  /**
   * Whether to say nobody has written about this dish.
   *
   * Only once the read has come back. A dish is opened *because* its row said
   * it had Bites, so an empty list here is a load in flight far more often
   * than it is an empty truth.
   */
  protected readonly isEmpty = computed(
    () => !this.loading() && this.bites().length === 0,
  );

  /** The rating as stars, or nothing where the Bite carries none. */
  protected stars(bite: Bite): string {
    return bite.rating ? '★'.repeat(Math.round(bite.rating)) : '';
  }
}
