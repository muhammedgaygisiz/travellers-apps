import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonContent,
  IonImg,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';
import { currencyCodes, getCurrencyForDevice } from 'utils';
import type { Menu, Restaurant } from 'model';
import { BusinessMenuComponent } from '../business-menu/business-menu.component';

@Component({
  selector: 'edit-menu-page',
  templateUrl: 'edit-menu-page.component.html',
  styleUrl: 'edit-menu-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonImg,
    IonItem,
    IonSelect,
    IonSelectOption,
    TranslocoPipe,
    FormsModule,
    BusinessMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMenuPage {
  restaurant = input<Restaurant>();

  menu = input<Menu>();

  saveMenu = output<Menu>();

  placeName = computed(() => this.restaurant()?.name);

  /**
   * The currency every price on this menu is stated in (GitHub issue #1102).
   *
   * Asked once, at the top, rather than per price: a menu is priced in one
   * currency, and a per-item control would invite two.
   */
  readonly currency = linkedSignal(() => this.menu()?.currency ?? '');

  /**
   * What to offer, with the owner's likely answer first.
   *
   * The device's own currency is a good guess and never an answer - a chain
   * operator editing a Zurich menu from Berlin would be handed euros - so it is
   * pre-selected and still has to be saved. `Not set` stays available, because
   * a menu that has never stated its currency shows bare numbers, which a guest
   * can ask about, rather than a symbol the product guessed and they believe.
   */
  readonly currencies = computed(() => {
    const suggested = getCurrencyForDevice({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const rest = currencyCodes.filter(({ code }) => code !== suggested);

    return [...currencyCodes.filter(({ code }) => code === suggested), ...rest];
  });

  saveCurrency(): void {
    const menu = this.menu();

    if (!menu) {
      return;
    }

    const currency = this.currency();

    // Absent rather than empty. "Not set" is a real answer here and the model
    // reads a missing field as "not stated"; writing `''` would be a third
    // value every reader then has to know about.
    const { currency: _dropped, ...withoutCurrency } = menu;

    this.saveMenu.emit(
      currency ? { ...withoutCurrency, currency } : withoutCurrency,
    );
  }
}
