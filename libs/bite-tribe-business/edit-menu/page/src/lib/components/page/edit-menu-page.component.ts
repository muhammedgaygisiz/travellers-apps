import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import type { Category, Menu, MenuItem, Restaurant } from 'model';
import { currencyCodes, getCurrencyForDevice } from 'utils';
import {
  type CategoryDetails,
  type DishRef,
  moveCategory,
  moveDish,
  removeCategory,
  removeDish,
  saveCategoryDetails,
  saveDish,
  saveExtras,
  setAvailability,
} from '../../utils/menu-edits';
import { CategoryEditorComponent } from '../category-editor/category-editor.component';
import { DishEditorComponent } from '../dish-editor/dish-editor.component';
import {
  AvailabilityChange,
  DishMove,
  MenuListComponent,
} from '../menu-list/menu-list.component';

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
    IonSelect,
    IonSelectOption,
    IonButton,
    TranslocoPipe,
    FormsModule,
    MenuListComponent,
    DishEditorComponent,
    CategoryEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMenuPage {
  restaurant = input<Restaurant>();

  menu = input<Menu>();

  saveMenu = output<Menu>();

  saveCurrencyCode = output<string>();

  placeName = computed(() => this.restaurant()?.name);

  readonly currency = linkedSignal(() => this.menu()?.currency ?? '');

  readonly currencies = computed(() => {
    const suggested = getCurrencyForDevice({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const rest = currencyCodes.filter(({ code }) => code !== suggested);

    return [...currencyCodes.filter(({ code }) => code === suggested), ...rest];
  });

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

  /** Extras keep the category editor open: they are added one at a time. */
  onSaveExtras(extrasBlock: Category['extrasBlock']): void {
    const editing = this.editing();

    if (editing?.kind === 'category' && editing.categoryId) {
      const categoryId = editing.categoryId;
      this.write((menu) => saveExtras(menu, categoryId, extrasBlock), false);
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
