import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton, IonIcon, IonInput } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Category, ExtraItem } from 'model';
import { createEntityId } from 'utils';

/** The extras block as this editor writes it. `undefined` once it is empty. */
export type ExtrasBlock = Category['extrasBlock'];

/**
 * The owner authoring a category's extras (GitHub issue #1598).
 *
 * ## Why the category and not the dish
 *
 * `Category.extrasBlock` carries the argument. In short: the block's
 * description is the owner's own sentence saying who the extras are offered
 * with - "add to any pizza" - which is what a paper menu prints once under a
 * section, and what this form asks for first. Authoring the same extra on
 * every pizza instead would be four copies of one price to keep in step.
 *
 * ## Why this is its own component
 *
 * `BusinessCategoryComponent` already owns two debounced fields and the item
 * reorder, and extras are a third editable list with their own add and remove.
 * Folding them in would have made one component the place three unrelated
 * edits are merged; here the category merges one output.
 *
 * ## Committing on blur rather than on keystroke
 *
 * The title and subtitle above debounce, because they are one field each and
 * a debounce there costs one timer. A grid of rows would need a form instance
 * per row, recreated whenever a row is added or removed - and a row rebuilt
 * mid-edit is the `linkedSignal` problem `withMenuIds` exists to avoid, one
 * layer up. `ionChange` fires when a field is left, which is also when an
 * owner editing a price grid has finished with a cell.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'business-category-extras',
  templateUrl: './business-category-extras.component.html',
  styleUrl: './business-category-extras.component.scss',
  imports: [IonButton, IonIcon, IonInput, TranslocoPipe],
})
export class BusinessCategoryExtrasComponent {
  extrasBlock = input<ExtrasBlock>();

  /** The symbol the menu's prices are stated in (issue #1102). */
  currencySymbol = input('');

  /**
   * The block as it now stands, or `undefined` once the last extra is gone.
   *
   * `undefined` rather than an empty list, because the field is optional on
   * the model and absent means "this section offers no extras". Keeping an
   * empty block would write a description nothing is attached to, and every
   * renderer would then have to decide whether to draw a heading over nothing.
   */
  extrasBlockChanged = output<ExtrasBlock>();

  protected readonly extras = computed<readonly ExtraItem[]>(
    () => this.extrasBlock()?.extras ?? [],
  );

  protected readonly description = computed(
    () => this.extrasBlock()?.description ?? '',
  );

  /** Whether the add row is open. Closed again the moment an extra lands. */
  protected readonly isAdding = signal(false);

  protected readonly newName = signal('');
  protected readonly newPrice = signal<number | undefined>(undefined);

  /**
   * An extra needs a name and a price before it can be added.
   *
   * A price of zero is refused along with an absent one, deliberately: an
   * extra that costs nothing is part of the dish's description rather than
   * something a guest is charged for, and a row of `0` on a bill is a question
   * the waiter has to answer.
   */
  protected readonly canAdd = computed(() => {
    const price = this.newPrice();

    return !!this.newName().trim() && price !== undefined && price > 0;
  });

  protected showAdd(): void {
    this.isAdding.set(true);
  }

  protected cancelAdd(): void {
    this.isAdding.set(false);
    this.newName.set('');
    this.newPrice.set(undefined);
  }

  protected onDescriptionChange(description: string): void {
    // Only where there is something to describe. A description with no extras
    // under it is the empty block this component refuses to emit.
    if (!this.extras().length) {
      return;
    }

    this.emit(description, this.extras());
  }

  protected addExtra(): void {
    if (!this.canAdd()) {
      return;
    }

    // The id is minted here and never again, exactly as the item editor mints
    // an item's (issue #1099): an order line records it, and regenerating one
    // on a later save would repoint every line that already carries it.
    const extra: ExtraItem = {
      id: createEntityId(),
      name: this.newName().trim(),
      price: this.newPrice() as number,
    };

    this.emit(this.description(), [...this.extras(), extra]);
    this.cancelAdd();
  }

  protected renameExtra(index: number, name: string): void {
    const trimmed = name.trim();

    // A blank name is a field an owner cleared on the way to typing a new one,
    // not an instruction to unname an extra a guest may be looking at. The
    // input keeps showing the old value, because nothing was emitted.
    if (!trimmed || trimmed === this.extras()[index]?.name) {
      return;
    }

    this.replace(index, { name: trimmed });
  }

  protected repriceExtra(index: number, price: number | undefined): void {
    if (price === undefined || !Number.isFinite(price) || price <= 0) {
      return;
    }

    if (price === this.extras()[index]?.price) {
      return;
    }

    this.replace(index, { price });
  }

  /**
   * Takes one extra off the category.
   *
   * The first delete in this editor, and it is deliberately not a soft one: a
   * menu item has `isAvailable` because a kitchen runs out of sea bass for an
   * evening, and an extra that is no longer offered is a decision rather than
   * a shortage. Orders already placed are unaffected - each line carries its
   * own copy of every extra it was ordered with.
   */
  protected removeExtra(index: number): void {
    const remaining = this.extras().filter((_, at) => at !== index);

    this.emit(this.description(), remaining);
  }

  private replace(index: number, changes: Partial<ExtraItem>): void {
    const extras = this.extras().map((extra, at) =>
      at === index ? { ...extra, ...changes } : extra,
    );

    this.emit(this.description(), extras);
  }

  private emit(description: string, extras: readonly ExtraItem[]): void {
    this.extrasBlockChanged.emit(
      extras.length ? { description, extras: [...extras] } : undefined,
    );
  }
}
