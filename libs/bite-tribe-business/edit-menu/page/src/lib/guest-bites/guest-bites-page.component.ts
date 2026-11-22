import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonThumbnail,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import type { Bite, Menu, MenuItem, Restaurant } from 'model';
import { menuDishes, suggestedDish, unlinkedBites } from './guest-bites';

/** An owner's link between a Bite and a dish (GitHub issue #2216). */
export interface GuestBiteLink {
  readonly biteId: string;
  readonly menuItemId: string;
  readonly variantId?: string;
}

/**
 * The business app's Guest Bites page (GitHub issue #2216).
 *
 * The restaurant's Bites that are linked to no dish yet, each with the dish
 * whose name matches if there is one. The owner links it, chooses another
 * dish, or says it is about nothing on the menu. A Bite leaves the list once
 * the list it came from is read back.
 */
@Component({
  selector: 'bt-guest-bites-page',
  templateUrl: 'guest-bites-page.component.html',
  styleUrl: 'guest-bites-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonButton,
    IonIcon,
    IonModal,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    IonSelectOption,
    FormsModule,
    TranslocoPipe,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestBitesPage {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly restaurant = input<Restaurant>();
  readonly menu = input<Menu>();
  /** `undefined` while loading. */
  readonly bites = input<Bite[]>();

  readonly linkBite = output<GuestBiteLink>();
  readonly dismissBite = output<string>();

  readonly rows = computed(() =>
    unlinkedBites(this.bites() ?? []).map((bite) => ({
      bite,
      suggestion: suggestedDish(bite, this.menu()),
    })),
  );

  readonly dishes = computed(() => menuDishes(this.menu()));

  /** The Bite the dish picker is open for. */
  readonly choosingFor = signal<Bite | undefined>(undefined);
  readonly chosenItemId = signal<string | undefined>(undefined);
  readonly chosenVariantId = signal<string>('');

  readonly chosenItem = computed<MenuItem | undefined>(
    () =>
      this.dishes().find(({ item }) => item.id === this.chosenItemId())?.item,
  );

  link(bite: Bite, item: MenuItem): void {
    this.linkBite.emit({ biteId: bite.id, menuItemId: item.id });
  }

  openPicker(bite: Bite): void {
    this.choosingFor.set(bite);
    this.chosenItemId.set(suggestedDish(bite, this.menu())?.id);
    this.chosenVariantId.set('');
  }

  closePicker(): void {
    this.choosingFor.set(undefined);
  }

  chooseItem(itemId: string): void {
    this.chosenItemId.set(itemId);
    this.chosenVariantId.set('');
  }

  confirmChoice(): void {
    const bite = this.choosingFor();
    const menuItemId = this.chosenItemId();

    if (!bite || !menuItemId) {
      return;
    }

    const variantId = this.chosenVariantId();

    this.linkBite.emit(
      variantId
        ? { biteId: bite.id, menuItemId, variantId }
        : { biteId: bite.id, menuItemId },
    );
    this.closePicker();
  }

  /**
   * Asks once: the Bite leaves the list for good, because this page offers no
   * way to bring a dismissed Bite back.
   */
  async confirmNotOnMenu(bite: Bite): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('guest-bites-not-on-menu-confirm-title'),
      message: this.transloco.translate(
        'guest-bites-not-on-menu-confirm-message',
        { name: bite.name },
      ),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('guest-bites-not-on-menu'),
          role: 'confirm',
          handler: (): void => this.dismissBite.emit(bite.id),
        },
      ],
    });

    await alert.present();
  }
}
