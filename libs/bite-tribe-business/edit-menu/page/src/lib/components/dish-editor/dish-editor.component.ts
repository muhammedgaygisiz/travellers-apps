import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
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
import { editableDish } from '../../utils/menu-edits';

type VariantForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  price: FormControl<number | null>;
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

  readonly save = output<MenuItem>();

  /** The dietary vocabulary, in the order it is offered (issue #2194). */
  readonly dietaryLabelOptions = DIETARY_LABELS;
  readonly cancelEdit = output<void>();
  /** The owner confirmed deleting the stored dish (GitHub issue #2181). */
  readonly deleteDish = output<void>();

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: this.formBuilder.control<number | null>(null),
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

  /** The stored dish, read into the form whenever a different one opens. */
  readonly load = effect(() => {
    const stored = this.dish();
    const dish = stored ? editableDish(stored) : undefined;

    this.variants.clear();
    this.optionGroups.clear();
    this.form.reset({
      name: dish?.name ?? '',
      description: dish?.description ?? '',
      price: dish && !dish.variants?.length ? dish.price : null,
      ingredients: dish?.ingredients ?? '',
      notes: dish?.notes ?? '',
      isAvailable: dish?.isAvailable !== false,
      ...this.dietaryValue(dish),
    });
    // After the reset, which would otherwise empty every variant row.
    (dish?.variants ?? []).forEach((variant) =>
      this.variants.push(this.variantForm(variant), { emitEvent: false }),
    );
    (dish?.optionGroups ?? []).forEach((group) =>
      this.optionGroups.push(this.optionGroupForm(group), {
        emitEvent: false,
      }),
    );
    this.syncPriceValidators();
    this.form.markAsPristine();
  });

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
      price: this.formBuilder.control<number | null>(variant?.price ?? null, [
        Validators.required,
        Validators.min(MIN_PRICE),
      ]),
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
      this.variants.length
        ? []
        : [Validators.required, Validators.min(MIN_PRICE)],
    );
    price.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity();
  }

  addVariant(): void {
    this.variants.push(this.variantForm());
    this.syncPriceValidators();
    this.form.markAsDirty();
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
    this.syncPriceValidators();
    this.form.markAsDirty();
  }

  /**
   * A new group starts with two empty choices and required, because the case
   * the feature exists for - mild or hot - is a question the kitchen needs an
   * answer to.
   */
  addOptionGroup(): void {
    this.optionGroups.push(this.optionGroupForm());
    this.form.markAsDirty();
  }

  removeOptionGroup(index: number): void {
    this.optionGroups.removeAt(index);
    this.form.markAsDirty();
  }

  addChoice(groupIndex: number): void {
    this.optionGroups.at(groupIndex).controls.choices.push(this.choiceForm());
    this.form.markAsDirty();
  }

  removeChoice(groupIndex: number, choiceIndex: number): void {
    this.optionGroups.at(groupIndex).controls.choices.removeAt(choiceIndex);
    this.form.markAsDirty();
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
        price: Number(variant.price),
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
      price: variants.length ? 0 : Number(value.price),
      ...(ingredients ? { ingredients } : {}),
      ...(notes ? { notes } : {}),
      isAvailable: value.isAvailable,
      ...dietaryFields(value.dietaryLabels, value.dietaryOptions),
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
