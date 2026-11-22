import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AlertController,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import tzlookup from '@photostructure/tz-lookup';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import type { Category, Geopoint, Menu, MenuItem, Restaurant } from 'model';
import {
  currencyCodes,
  getCurrencyForDevice,
  getCurrencyForTimeZone,
  getLocalizedCurrencyName,
} from 'utils';
import {
  type CategoryDetails,
  type DishRef,
  moveCategory,
  moveDish,
  removeCategory,
  removeDish,
  saveCategoryDetails,
  saveDish,
  setAvailability,
} from '../../utils/menu-edits';
import { CategoryEditorComponent } from '../category-editor/category-editor.component';
import { DishEditorComponent } from '../dish-editor/dish-editor.component';
import {
  AvailabilityChange,
  DishMove,
  MenuListComponent,
} from '../menu-list/menu-list.component';

/** One row of the currency picker (GitHub issue #2255). */
export interface CurrencyOption {
  readonly code: string;
  readonly symbol: string;
  /** In the owner's language where the browser knows it. */
  readonly name: string;
}

/**
 * The currency of the country a restaurant's position lies in (GitHub issue
 * #2255), through the zone the position is in, looked up offline as #2228
 * looks up the zone itself. `undefined` without a position, or for a zone the
 * region map does not know. `0, 0` is where a restaurant without a position
 * starts, not a place in the Gulf of Guinea.
 */
const positionCurrency = (
  position: Geopoint | undefined,
): string | undefined => {
  if (!position || (!position.latitude && !position.longitude)) {
    return undefined;
  }

  try {
    return getCurrencyForTimeZone(
      tzlookup(position.latitude, position.longitude),
    );
  } catch {
    return undefined;
  }
};

/** What the editor panel holds: a dish, a category, or nothing. */
export type MenuEditing =
  | {
      readonly kind: 'dish';
      readonly categoryId: string;
      readonly itemId?: string;
    }
  | { readonly kind: 'category'; readonly categoryId?: string };

/**
 * The business menu editor (GitHub issue #2182): the menu as a list that reads
 * like the menu, and one editor at a time for a dish or a category.
 *
 * On a wide screen the editor opens beside the list; on a phone it takes the
 * page, and closing it returns to the list.
 *
 * Every change is a whole-menu save made from the stored menu, through the
 * pure functions in `menu-edits`. An open editor closes once the saved menu
 * has been read back, so a refused save leaves the owner's edit where it was.
 */
@Component({
  selector: 'edit-menu-page',
  templateUrl: 'edit-menu-page.component.html',
  styleUrl: 'edit-menu-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonNote,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSearchbar,
    IonText,
    IonButton,
    IonIcon,
    TranslocoPipe,
    MenuListComponent,
    DishEditorComponent,
    CategoryEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMenuPage {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  restaurant = input<Restaurant>();

  menu = input<Menu>();

  saveMenu = output<Menu>();

  saveCurrencyCode = output<string>();

  /** The owner confirmed a menu built from Bites as their own (#2214). */
  confirmAsOwn = output<void>();

  /**
   * Whether the menu still carries the mark verification gave it (GitHub
   * issue #2214). Shown whether or not the menu has items, unlike the
   * consumer notice: the owner may want to confirm before guests see any.
   */
  readonly derivedFromBites = computed(() => !!this.menu()?.derivedFromBites);

  placeName = computed(() => this.restaurant()?.name);

  readonly currency = linkedSignal(() => this.menu()?.currency ?? '');

  /** The device's own currency, the suggestion only without a position. */
  readonly deviceCurrency = getCurrencyForDevice({
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  /**
   * The currency offered to a menu that has none (GitHub issue #2255): the
   * restaurant's, from its position, and the device's only when the position
   * says nothing. A chain or an agency sets menus up from somewhere else, so
   * the device is the weaker signal.
   */
  readonly suggestedCurrency = computed(() => {
    const fromPosition = positionCurrency(this.restaurant()?.position);

    return fromPosition
      ? { code: fromPosition, source: 'position' as const }
      : { code: this.deviceCurrency, source: 'device' as const };
  });

  /**
   * Every currency, by code, with the suggestion first (GitHub issue #2255).
   * By code because the list shows codes: in country order "GBP" came right
   * after "BRL" and read as no order at all.
   */
  readonly currencies = computed<CurrencyOption[]>(() => {
    const lang = this.transloco.getActiveLang();
    const suggested = this.suggestedCurrency().code;
    const options = [...currencyCodes]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(({ code, symbol, name }) => ({
        code,
        symbol,
        name: getLocalizedCurrencyName(code, lang, name),
      }));

    return [
      ...options.filter(({ code }) => code === suggested),
      ...options.filter(({ code }) => code !== suggested),
    ];
  });

  /** The searchable currency picker (#2255): open, and what is typed in it. */
  readonly currencyPickerOpen = signal(false);
  readonly currencyQuery = signal('');

  /** The currencies whose code, symbol or name contains the query. */
  readonly matchingCurrencies = computed(() => {
    const query = this.currencyQuery().trim().toLowerCase();

    return query
      ? this.currencies().filter(({ code, symbol, name }) =>
          [code, symbol, name].some((field) =>
            field.toLowerCase().includes(query),
          ),
        )
      : this.currencies();
  });

  /** The chosen currency's row, for the picker's closed state. */
  readonly currentCurrency = computed(() =>
    this.currencies().find(({ code }) => code === this.currency()),
  );

  openCurrencyPicker(): void {
    this.currencyQuery.set('');
    this.currencyPickerOpen.set(true);
  }

  /** Saved at once, as the select it replaces was; `''` unsets it. */
  chooseCurrency(code: string): void {
    this.currencyPickerOpen.set(false);

    if (code === this.currency()) {
      return;
    }

    this.currency.set(code);
    this.saveCurrency();
  }

  readonly editing = signal<MenuEditing | undefined>(undefined);

  /** Set by a save; the next menu read back closes the editor. */
  private readonly awaitingSavedMenu = signal(false);

  /**
   * Reacts to the menu alone: reading the flag untracked keeps setting it
   * from closing the editor before the saved menu has come back.
   */
  readonly closeOnSavedMenu = effect(() => {
    this.menu();

    untracked(() => {
      if (this.awaitingSavedMenu()) {
        this.awaitingSavedMenu.set(false);
        this.editing.set(undefined);
      }
    });
  });

  private categoryOf(categoryId: string | undefined): Category | undefined {
    return this.menu()?.categories.find(({ id }) => id === categoryId);
  }

  readonly editingDish = computed<MenuItem | undefined>(() => {
    const editing = this.editing();

    if (editing?.kind !== 'dish' || !editing.itemId) {
      return undefined;
    }

    return this.categoryOf(editing.categoryId)?.items?.find(
      ({ id }) => id === editing.itemId,
    );
  });

  readonly editingCategory = computed<Category | undefined>(() => {
    const editing = this.editing();

    return this.categoryOf(editing?.categoryId);
  });

  readonly selectedId = computed(() => {
    const editing = this.editing();

    if (!editing) {
      return undefined;
    }

    return editing.kind === 'dish' ? editing.itemId : editing.categoryId;
  });

  saveCurrency(): void {
    if (!this.menu()) {
      return;
    }

    this.saveCurrencyCode.emit(this.currency());
  }

  /**
   * Asks once before the owner takes the menu as their own (GitHub issue
   * #2214): it cannot be undone here, and it is the owner's word that every
   * price on it is theirs, not only the ones they have edited.
   */
  async confirmMenuAsOwn(): Promise<void> {
    if (!this.derivedFromBites()) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.transloco.translate('menu-confirm-own-title'),
      message: this.transloco.translate('menu-confirm-own-message'),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('menu-confirm-own'),
          role: 'confirm',
          handler: (): void => this.confirmAsOwn.emit(),
        },
      ],
    });

    await alert.present();
  }

  openDish(ref: DishRef): void {
    this.editing.set({
      kind: 'dish',
      categoryId: ref.categoryId,
      itemId: ref.itemId,
    });
  }

  addDish(categoryId: string): void {
    this.editing.set({ kind: 'dish', categoryId });
  }

  openCategory(categoryId: string): void {
    this.editing.set({ kind: 'category', categoryId });
  }

  addCategory(): void {
    this.editing.set({ kind: 'category' });
  }

  closeEditor(): void {
    this.editing.set(undefined);
  }

  private write(change: (menu: Menu) => Menu, closesEditor = true): void {
    const menu = this.menu();

    if (!menu) {
      return;
    }

    this.awaitingSavedMenu.set(closesEditor);
    this.saveMenu.emit(change(menu));
  }

  onSaveDish(dish: MenuItem): void {
    const editing = this.editing();

    if (editing?.kind === 'dish') {
      this.write((menu) => saveDish(menu, editing.categoryId, dish));
    }
  }

  onSaveCategory(details: CategoryDetails): void {
    const editing = this.editing();

    if (editing?.kind === 'category') {
      this.write((menu) =>
        saveCategoryDetails(menu, editing.categoryId, details),
      );
    }
  }

  /**
   * Deletes the open dish, once its editor has had the owner confirm (GitHub
   * issue #2181). The editor closes when the saved menu comes back, as after
   * any save.
   */
  onDeleteDish(): void {
    const editing = this.editing();

    if (editing?.kind === 'dish' && editing.itemId) {
      const { categoryId, itemId } = editing;

      this.write((menu) => removeDish(menu, categoryId, itemId));
    }
  }

  /** Deletes the open category with everything in it (GitHub issue #2181). */
  onDeleteCategory(): void {
    const editing = this.editing();

    if (editing?.kind === 'category' && editing.categoryId) {
      const categoryId = editing.categoryId;

      this.write((menu) => removeCategory(menu, categoryId));
    }
  }

  onAvailabilityChange({ ref, available }: AvailabilityChange): void {
    this.write((menu) => setAvailability(menu, ref, available), false);
  }

  onMoveCategory({ from, to }: { from: number; to: number }): void {
    this.write((menu) => moveCategory(menu, from, to), false);
  }

  onMoveDish({ categoryId, from, to }: DishMove): void {
    this.write((menu) => moveDish(menu, categoryId, from, to), false);
  }
}
