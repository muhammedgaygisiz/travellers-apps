import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  DIETARY_LABELS,
  menuItemDietaryOf,
  type DietaryLabel,
  type MenuItem,
  type MenuOptionGroup,
} from 'model';
import { map, startWith } from 'rxjs';
import { createEntityId } from 'utils';
import {
  formatPriceInput,
  parsePriceInput,
  priceValidator,
} from '../../utils/price-input';
import { editableDish } from '../../utils/menu-edits';

type VariantForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  /** Text as the field shows it, or a number patched in (issue #2279). */
  price: FormControl<number | string | null>;
  dietaryLabels: FormControl<DietaryLabel[]>;
  dietaryOptions: FormControl<DietaryLabel[]>;
}>;

/**
 * A dish's declared dietary labels and options, as they are saved (GitHub
 * issue #2194): an empty list leaves the field off, and an option the dish
 * already fits as served is dropped rather than stored twice.
 */
const dietaryFields = (
  labels: DietaryLabel[],
  options: DietaryLabel[],
): Pick<MenuItem, 'dietaryLabels' | 'dietaryOptions'> => {
  const dietary = menuItemDietaryOf({
    dietaryLabels: labels,
    dietaryOptions: options,
  });

  return {
    ...(dietary.labels.length ? { dietaryLabels: dietary.labels } : {}),
    ...(dietary.options.length ? { dietaryOptions: dietary.options } : {}),
  };
};

type ChoiceForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
}>;

type OptionGroupForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  required: FormControl<boolean>;
  choices: FormArray<ChoiceForm>;
}>;

/**
 * Moves one row of a form array to another index and marks the array edited
 * (GitHub issues #2256, #2277). Out of range or in place is a no-op, so the
 * first row's "up" and the last row's "down" need no guard of their own.
 */
const moveControl = <T extends AbstractControl>(
  array: FormArray<T>,
  from: number,
  to: number,
): void => {
  if (to < 0 || to >= array.length || from === to) {
    return;
  }

  const control = array.at(from) as T;

  array.removeAt(from, { emitEvent: false });
  array.insert(to, control);
  array.markAsDirty();
};

/** A group is a choice between things, so it needs at least two of them. */
const MIN_CHOICES = 2;

/** The smallest price a dish or variant can be saved with. */
const MIN_PRICE = 0.01;

/**
 * One dish, opened from the menu list (GitHub issue #2182).
 *
 * Every field of the dish in one form with one Save and one Cancel, rather
 * than a Save per field: a dish is changed as a whole, and one save per
 * editor is what keeps two open edits from writing over each other.
 *
 * A dish with variants has no price of its own. Each variant - Pad Thai
 * vegetarian, with chicken; a pizza regular or large - is a version of the
 * dish with its own name and price, and guests order one of them.
 */
@Component({
  selector: 'bt-dish-editor',
  templateUrl: './dish-editor.component.html',
  styleUrl: './dish-editor.component.scss',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    IonList,
    IonItem,
    IonInput,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  /** The dish to edit; absent for a new one. */
  readonly dish = input<MenuItem>();
  readonly categoryTitle = input<string>();
  readonly currency = input<string>();

  /**
   * The currency for formatting a price into its field (issue #2279), read
   * untracked: the load effect must not re-run - and reset an open edit - when
   * the currency changes (#2259).
   */
  private currencyCode(): string | undefined {
    return untracked(() => this.currency());
  }

  readonly save = output<MenuItem>();

  /** The dietary vocabulary, in the order it is offered (issue #2194). */
  readonly dietaryLabelOptions = DIETARY_LABELS;

  /**
   * The labels diners' disputes removed from the dish or one of its variants
   * (issue #2198), read off the stored item. Locked: the pickers do not offer
   * them, and the backend refuses them anyway.
   */
  removedLabelsOf(id: string | undefined): DietaryLabel[] {
    const dish = this.dish();

    if (!dish || !id) {
      return [];
    }

    const item =
      dish.id === id
        ? dish
        : dish.variants?.find((variant) => variant.id === id);

    return item?.removedDietaryLabels ?? [];
  }

  /** The removed labels by name, for the note under the pickers. */
  removedLabelNames(labels: readonly DietaryLabel[]): string {
    return labels
      .map((label) => this.transloco.translate(`dietary-label-${label}`))
      .join(', ');
  }
  readonly cancelEdit = output<void>();
  /** The owner confirmed deleting the stored dish (GitHub issue #2181). */
  readonly deleteDish = output<void>();

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: this.formBuilder.control<number | string | null>(null),
    ingredients: [''],
    notes: [''],
    isAvailable: [true],
    dietaryLabels: [[] as DietaryLabel[]],
    dietaryOptions: [[] as DietaryLabel[]],
    variants: this.formBuilder.array<VariantForm>([]),
    optionGroups: this.formBuilder.array<OptionGroupForm>([]),
  });

  get variants(): FormArray<VariantForm> {
    return this.form.controls.variants;
  }

  /** Priceless choices on the dish (GitHub issue #2254). */
  get optionGroups(): FormArray<OptionGroupForm> {
    return this.form.controls.optionGroups;
  }

  private readonly value = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
  );

  readonly hasVariants = computed(
    () => (this.value()?.variants.length ?? 0) > 0,
  );

  readonly isNew = computed(() => !this.dish());

  /** The id of the dish the form was last read from. */
  private loadedId: string | undefined;

  /**
   * The stored dish, read into the form when it opens (GitHub issue #2259).
   *
   * The same dish arrives again whenever the menu is read back after a save
   * of something else - the currency, an availability switch, a reorder in
   * the list - while this editor is open. Reading it into the form then used
   * to drop whatever the owner had typed and leave the editor open as if
   * nothing had been changed. So a re-read of the same dish replaces the form
   * only while the owner has changed nothing; with an edit pending, it keeps
   * the edit and refreshes just the fields the owner has not touched, so a
   * switch flipped in the list is not undone by this editor's Save.
   */
  readonly load = effect(() => {
    const stored = this.dish();
    const sameDish = !!stored && stored.id === this.loadedId;

    if (sameDish && this.form.dirty) {
      this.refreshUntouched(stored);

      return;
    }

    this.loadedId = stored?.id;
    this.readIntoForm(stored);
  });

  private readIntoForm(stored: MenuItem | undefined): void {
    const dish = stored ? editableDish(stored) : undefined;

    this.variants.clear();
    this.optionGroups.clear();
    this.form.reset(this.scalarValue(dish));
    // After the reset, which would otherwise empty every variant row.
    this.readVariants(dish);
    this.readOptionGroups(dish);
    this.syncPriceValidators();
    this.form.markAsPristine();
  }

  /** The fields the owner has not touched, read again from the stored dish. */
  private refreshUntouched(stored: MenuItem): void {
    const dish = editableDish(stored);
    const scalars = this.scalarValue(dish);
    const controls = this.form.controls;

    (Object.keys(scalars) as (keyof typeof scalars)[]).forEach((key) => {
      const control = controls[key];

      if (control.pristine) {
        control.setValue(scalars[key] as never, { emitEvent: false });
      }
    });

    if (this.variants.pristine) {
      this.variants.clear({ emitEvent: false });
      this.readVariants(dish);
      this.syncPriceValidators();
    }

    if (this.optionGroups.pristine) {
      this.optionGroups.clear({ emitEvent: false });
      this.readOptionGroups(dish);
    }

    this.form.updateValueAndValidity();
  }

  private scalarValue(dish: MenuItem | undefined): {
    name: string;
    description: string;
    price: string | null;
    ingredients: string;
    notes: string;
    isAvailable: boolean;
    dietaryLabels: DietaryLabel[];
    dietaryOptions: DietaryLabel[];
  } {
    return {
      name: dish?.name ?? '',
      description: dish?.description ?? '',
      price:
        dish && !dish.variants?.length
          ? formatPriceInput(dish.price, this.currencyCode())
          : null,
      ingredients: dish?.ingredients ?? '',
      notes: dish?.notes ?? '',
      isAvailable: dish?.isAvailable !== false,
      ...this.dietaryValue(dish),
    };
  }

  private readVariants(dish: MenuItem | undefined): void {
    (dish?.variants ?? []).forEach((variant) =>
      this.variants.push(this.variantForm(variant), { emitEvent: false }),
    );
  }

  private readOptionGroups(dish: MenuItem | undefined): void {
    (dish?.optionGroups ?? []).forEach((group) =>
      this.optionGroups.push(this.optionGroupForm(group), {
        emitEvent: false,
      }),
    );
  }

  /** What the form shows: known labels only, never an option twice. */
  private dietaryValue(item: MenuItem | undefined): {
    dietaryLabels: DietaryLabel[];
    dietaryOptions: DietaryLabel[];
  } {
    const dietary = menuItemDietaryOf(item);

    return { dietaryLabels: dietary.labels, dietaryOptions: dietary.options };
  }

  private variantForm(variant?: MenuItem): VariantForm {
    const dietary = this.dietaryValue(variant);

    return this.formBuilder.group({
      id: this.formBuilder.nonNullable.control(variant?.id ?? createEntityId()),
      name: this.formBuilder.nonNullable.control(variant?.name ?? '', [
        Validators.required,
      ]),
      price: this.formBuilder.control<number | string | null>(
        variant ? formatPriceInput(variant.price, this.currencyCode()) : null,
        [priceValidator(MIN_PRICE)],
      ),
      dietaryLabels: this.formBuilder.nonNullable.control(
        dietary.dietaryLabels,
      ),
      dietaryOptions: this.formBuilder.nonNullable.control(
        dietary.dietaryOptions,
      ),
    });
  }

  private optionGroupForm(group?: MenuOptionGroup): OptionGroupForm {
    const choices = group?.choices.length
      ? group.choices
      : [undefined, undefined];

    return this.formBuilder.group({
      id: this.formBuilder.nonNullable.control(group?.id ?? createEntityId()),
      name: this.formBuilder.nonNullable.control(group?.name ?? '', [
        Validators.required,
      ]),
      required: this.formBuilder.nonNullable.control(group?.required ?? true),
      choices: this.formBuilder.array<ChoiceForm>(
        choices.map((choice) => this.choiceForm(choice)),
        [Validators.minLength(MIN_CHOICES)],
      ),
    });
  }

  private choiceForm(choice?: { id: string; name: string }): ChoiceForm {
    return this.formBuilder.group({
      id: this.formBuilder.nonNullable.control(choice?.id ?? createEntityId()),
      name: this.formBuilder.nonNullable.control(choice?.name ?? '', [
        Validators.required,
      ]),
    });
  }

  /** The dish's own price is required only while it has no variants. */
  private syncPriceValidators(): void {
    const price = this.form.controls.price;

    price.setValidators(
      this.variants.length ? [] : [priceValidator(MIN_PRICE)],
    );
    price.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity();
  }

  addVariant(): void {
    this.variants.push(this.variantForm());
    this.syncPriceValidators();
    this.variants.markAsDirty();
  }

  /**
   * Moves a variant one place (GitHub issue #2256). The rows are the form
   * array, so the order the owner sees is the order Save writes, and guests
   * read the variants in that order - Small before Large. The same control
   * moves with its row, so a half-typed name or price goes with it.
   */
  moveVariant(from: number, to: number): void {
    moveControl(this.variants, from, to);
  }

  /** An option up or down among the dish's options (GitHub issue #2277). */
  moveOptionGroup(from: number, to: number): void {
    moveControl(this.optionGroups, from, to);
  }

  /** A choice up or down within its option (GitHub issue #2277). */
  moveChoice(groupIndex: number, from: number, to: number): void {
    moveControl(this.optionGroups.at(groupIndex).controls.choices, from, to);
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
    this.syncPriceValidators();
    this.variants.markAsDirty();
  }

  /**
   * A new group starts with two empty choices and required, because the case
   * the feature exists for - mild or hot - is a question the kitchen needs an
   * answer to.
   */
  addOptionGroup(): void {
    this.optionGroups.push(this.optionGroupForm());
    this.optionGroups.markAsDirty();
  }

  removeOptionGroup(index: number): void {
    this.optionGroups.removeAt(index);
    this.optionGroups.markAsDirty();
  }

  addChoice(groupIndex: number): void {
    this.optionGroups.at(groupIndex).controls.choices.push(this.choiceForm());
    this.optionGroups.markAsDirty();
  }

  removeChoice(groupIndex: number, choiceIndex: number): void {
    this.optionGroups.at(groupIndex).controls.choices.removeAt(choiceIndex);
    this.optionGroups.markAsDirty();
  }

  saveDish(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const stored = this.dish();
    const value = this.form.getRawValue();
    const storedVariants = new Map(
      (stored?.variants ?? []).map((variant) => [variant.id, variant]),
    );
    const variants: MenuItem[] = value.variants.map((variant) => {
      // The stored variant's labels are replaced, not merged: a label the
      // owner took off is gone (issue #2194).
      const before: Partial<MenuItem> = { ...storedVariants.get(variant.id) };
      delete before.dietaryLabels;
      delete before.dietaryOptions;

      return {
        ...before,
        id: variant.id,
        name: variant.name.trim(),
        description: '',
        price: parsePriceInput(variant.price) ?? 0,
        ...dietaryFields(variant.dietaryLabels, variant.dietaryOptions),
      };
    });
    const optionGroups: MenuOptionGroup[] = value.optionGroups.map((group) => ({
      id: group.id,
      name: group.name.trim(),
      required: group.required,
      choices: group.choices.map((choice) => ({
        id: choice.id,
        name: choice.name.trim(),
      })),
    }));
    const ingredients = value.ingredients.trim();
    const notes = value.notes.trim();

    this.save.emit({
      id: stored?.id ?? createEntityId(),
      name: value.name.trim(),
      description: value.description.trim(),
      price: variants.length ? 0 : (parsePriceInput(value.price) ?? 0),
      ...(ingredients ? { ingredients } : {}),
      ...(notes ? { notes } : {}),
      isAvailable: value.isAvailable,
      ...dietaryFields(value.dietaryLabels, value.dietaryOptions),
      // Kept so the lock still shows before the menu is read back (#2198).
      ...(stored?.removedDietaryLabels?.length
        ? { removedDietaryLabels: stored.removedDietaryLabels }
        : {}),
      ...(variants.length ? { variants } : {}),
      ...(optionGroups.length ? { optionGroups } : {}),
    });
  }

  /**
   * Asks before deleting the dish, because a delete is saved at once and has
   * no undo (GitHub issue #2181). Its variants go with it, and the question
   * says so when there are any.
   */
  async confirmDelete(): Promise<void> {
    const dish = this.dish();

    if (!dish) {
      return;
    }

    const variantCount = dish.variants?.length ?? 0;
    const alert = await this.alertController.create({
      header: this.transloco.translate('menu-dish-delete-confirm-title', {
        name: dish.name,
      }),
      message: this.transloco.translate(
        variantCount
          ? 'menu-dish-delete-confirm-message-variants'
          : 'menu-dish-delete-confirm-message',
        { count: variantCount },
      ),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('delete'),
          role: 'destructive',
          handler: (): void => this.deleteDish.emit(),
        },
      ],
    });

    await alert.present();
  }
}
