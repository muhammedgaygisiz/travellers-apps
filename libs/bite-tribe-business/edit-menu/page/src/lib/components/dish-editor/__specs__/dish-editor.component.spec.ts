import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { MenuItem } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { DishEditorComponent } from '../dish-editor.component';

addNecessaryIcons();

const PAD_THAI: MenuItem = {
  id: 'd1',
  name: 'Pad Thai',
  description: 'Rice noodles',
  price: 0,
  isAvailable: true,
  variants: [
    { id: 'v1', name: 'Vegetarian', description: '', price: 14 },
    {
      id: 'v2',
      name: 'With chicken',
      description: '',
      price: 16,
      isAvailable: false,
    },
  ],
};

const CHOP_SUEY: MenuItem = {
  id: 'd2',
  name: 'Chop-Suey-Spezial',
  description: '',
  price: 12.9,
  optionGroups: [
    {
      id: 'g1',
      name: 'Zubereitungsart',
      required: true,
      choices: [
        { id: 'c1', name: 'nicht scharf' },
        { id: 'c2', name: 'scharf' },
      ],
    },
  ],
};

/** See GitHub issue #2182. */
describe(DishEditorComponent.name, () => {
  let fixture: ComponentFixture<DishEditorComponent>;
  let component: DishEditorComponent;
  let componentRef: ComponentRef<DishEditorComponent>;
  let saved: jest.Mock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });

    fixture = TestBed.createComponent(DishEditorComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    saved = jest.fn();
    component.save.subscribe(saved);
  });

  const open = (dish: MenuItem | undefined): void => {
    componentRef.setInput('dish', dish);
    componentRef.setInput('currency', 'CHF');
    fixture.detectChanges();
  };

  it('needs a name and a price above zero for a new dish without variants', () => {
    open(undefined);

    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ name: 'Fried rice', price: 0 });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ price: 13 });
    expect(component.form.valid).toBe(true);
  });

  it('saves a new dish with its own price', () => {
    open(undefined);
    component.form.patchValue({
      name: ' Fried rice ',
      description: 'Egg, soy',
      price: 13,
      ingredients: ' ',
      notes: 'Spicy',
    });

    component.saveDish();

    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fried rice',
        description: 'Egg, soy',
        price: 13,
        notes: 'Spicy',
        isAvailable: true,
      }),
    );
    expect(saved.mock.calls[0][0]).not.toHaveProperty('ingredients');
    expect(saved.mock.calls[0][0]).not.toHaveProperty('variants');
  });

  it('saves nothing while the form is invalid', () => {
    open(undefined);

    component.saveDish();

    expect(saved).not.toHaveBeenCalled();
  });

  it('shows the variants of a dish, and asks no price of its own', () => {
    open(PAD_THAI);

    expect(component.variants.length).toBe(2);
    expect(component.hasVariants()).toBe(true);
    expect(component.form.valid).toBe(true);
  });

  it('saves the variants with their names and prices, and no dish price', () => {
    open(PAD_THAI);
    component.variants.at(0).patchValue({ name: 'Veggie', price: 15 });

    component.saveDish();

    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'd1',
        price: 0,
        variants: [
          { id: 'v1', name: 'Veggie', description: '', price: 15 },
          // The variant's own availability is kept: it is set from the list.
          {
            id: 'v2',
            name: 'With chicken',
            description: '',
            price: 16,
            isAvailable: false,
          },
        ],
      }),
    );
  });

  it('needs a name and a price on every variant', () => {
    open(PAD_THAI);
    component.addVariant();

    expect(component.form.invalid).toBe(true);

    component.variants.at(2).patchValue({ name: 'With beef', price: 17 });
    expect(component.form.valid).toBe(true);
  });

  it('asks for the dish price again once the last variant is removed', () => {
    open(PAD_THAI);
    component.removeVariant(1);
    component.removeVariant(0);

    expect(component.hasVariants()).toBe(false);
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ price: 12 });
    expect(component.form.valid).toBe(true);
  });

  it('opens a dish written before variants had names in the new shape', () => {
    open({
      id: 'd2',
      name: 'Margherita',
      description: 'Tomato',
      price: 11,
      variants: [
        { id: 'v9', name: 'Margherita', description: 'Large 40 cm', price: 14 },
      ],
    });

    expect(component.variants.getRawValue().map((v) => v.name)).toEqual([
      '',
      'Large 40 cm',
    ]);
    // Shown with the currency's decimals (#2279).
    expect(component.variants.at(0).value.price).toBe('11.00');
    // The first variant is the dish's old price; the owner names it first.
    expect(component.form.invalid).toBe(true);
  });

  it('lets the owner leave without saving', () => {
    open(PAD_THAI);
    const cancelled = jest.fn();
    component.cancelEdit.subscribe(cancelled);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="cancel-dish"]')
      ?.click();

    expect(cancelled).toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });

  it('marks the form edited when a variant is added or removed', () => {
    open(PAD_THAI);

    component.addVariant();
    expect(component.form.dirty).toBe(true);
  });

  /** Variants in the owner's order, Small before Large (GitHub issue #2256). */
  describe('moving a variant', () => {
    const button = (testId: string): HTMLIonButtonElement | null =>
      (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLIonButtonElement>(`[data-testid="${testId}"]`);

    it('saves the variants in the order they were moved to', () => {
      open(PAD_THAI);

      component.moveVariant(1, 0);
      component.saveDish();

      expect(
        (saved.mock.calls[0][0] as MenuItem).variants?.map(({ id }) => id),
      ).toEqual(['v2', 'v1']);
    });

    it('moves a half-typed row with what was typed in it', () => {
      open(PAD_THAI);
      component.variants.at(0).patchValue({ name: 'Veggie', price: 15 });

      component.moveVariant(0, 1);

      expect(component.variants.at(1).value).toEqual(
        expect.objectContaining({ id: 'v1', name: 'Veggie', price: 15 }),
      );
    });

    it('marks the form edited', () => {
      open(PAD_THAI);

      component.moveVariant(0, 1);

      expect(component.form.dirty).toBe(true);
    });

    it('ignores a move past either end', () => {
      open(PAD_THAI);

      component.moveVariant(0, -1);
      component.moveVariant(1, 2);

      expect(component.variants.controls.map((row) => row.value.id)).toEqual([
        'v1',
        'v2',
      ]);
      expect(component.form.dirty).toBe(false);
    });

    it('offers no move up on the first row and no move down on the last', () => {
      open(PAD_THAI);

      expect(button('move-dish-variant-up-0')?.disabled).toBe(true);
      expect(button('move-dish-variant-down-0')?.disabled).toBe(false);
      expect(button('move-dish-variant-up-1')?.disabled).toBe(false);
      expect(button('move-dish-variant-down-1')?.disabled).toBe(true);
    });

    it('moves a row from its button', () => {
      open(PAD_THAI);

      button('move-dish-variant-down-0')?.click();

      expect(component.variants.controls.map((row) => row.value.id)).toEqual([
        'v2',
        'v1',
      ]);
    });
  });

  /**
   * The same dish read back after a save of something else - the currency,
   * a switch or a reorder in the list - while the editor is open
   * (GitHub issue #2259).
   */
  describe('the same dish read again', () => {
    const BRUSCHETTA: MenuItem = {
      id: 'd3',
      name: 'Bruschetta',
      description: 'Tomato',
      price: 6.5,
    };

    const readAgain = (dish: MenuItem): void => {
      componentRef.setInput('dish', { ...dish });
      fixture.detectChanges();
    };

    it('keeps an unsaved edit, and Save stays on offer', () => {
      open(BRUSCHETTA);
      component.form.controls.name.setValue('Bruschetta al pomodoro');
      component.form.controls.name.markAsDirty();

      readAgain(BRUSCHETTA);

      expect(component.form.controls.name.value).toBe('Bruschetta al pomodoro');
      expect(component.form.dirty).toBe(true);
    });

    it('shows the new currency beside the kept edit', () => {
      open(BRUSCHETTA);
      component.form.controls.name.setValue('Bruschetta al pomodoro');
      component.form.controls.name.markAsDirty();

      componentRef.setInput('currency', 'EUR');
      readAgain(BRUSCHETTA);

      expect(component.form.controls.name.value).toBe('Bruschetta al pomodoro');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '[data-testid="dish-price"] [slot="end"]',
        )?.textContent,
      ).toContain('EUR');
    });

    it('reads again a field the owner has not touched', () => {
      open(BRUSCHETTA);
      component.form.controls.name.setValue('Bruschetta al pomodoro');
      component.form.controls.name.markAsDirty();

      // Switched off from the list while the editor was open.
      readAgain({ ...BRUSCHETTA, isAvailable: false });

      expect(component.form.controls.isAvailable.value).toBe(false);
      expect(component.form.controls.name.value).toBe('Bruschetta al pomodoro');
    });

    it('keeps an unsaved variant edit, and its moved order', () => {
      open(PAD_THAI);
      component.variants.at(0).controls.name.setValue('Veggie');
      component.variants.at(0).controls.name.markAsDirty();
      component.moveVariant(0, 1);

      readAgain(PAD_THAI);

      expect(component.variants.controls.map((row) => row.value.name)).toEqual([
        'With chicken',
        'Veggie',
      ]);
    });

    it('reads the variants again when only another field was edited', () => {
      open(PAD_THAI);
      component.form.controls.name.setValue('Pad Thai Spezial');
      component.form.controls.name.markAsDirty();

      readAgain({
        ...PAD_THAI,
        variants: [
          ...(PAD_THAI.variants ?? []),
          { id: 'v3', name: 'With tofu', description: '', price: 15 },
        ],
      });

      expect(component.variants.length).toBe(3);
      expect(component.form.controls.name.value).toBe('Pad Thai Spezial');
    });

    it('takes the stored dish whole while nothing was edited', () => {
      open(BRUSCHETTA);

      readAgain({ ...BRUSCHETTA, name: 'Bruschetta classica' });

      expect(component.form.controls.name.value).toBe('Bruschetta classica');
      expect(component.form.dirty).toBe(false);
    });

    it('replaces a pending edit when a different dish opens', () => {
      open(BRUSCHETTA);
      component.form.controls.name.setValue('Bruschetta al pomodoro');
      component.form.controls.name.markAsDirty();

      open(PAD_THAI);

      expect(component.form.controls.name.value).toBe(PAD_THAI.name);
      expect(component.form.dirty).toBe(false);
    });
  });

  it('reads the next dish when another one is opened', () => {
    open(PAD_THAI);
    component.form.patchValue({ name: 'Edited' });

    open({ id: 'd3', name: 'Water', description: '', price: 3 });

    expect(component.form.value.name).toBe('Water');
    expect(component.variants.length).toBe(0);
    expect(component.isNew()).toBe(false);
  });

  /** Dietary labels and options, as the restaurant declares them (#2194). */
  describe('dietary labels', () => {
    it('shows the declared labels and options, dropping unknown values', () => {
      open({
        ...PAD_THAI,
        dietaryLabels: ['halal', 'keto' as never],
        dietaryOptions: ['vegan', 'halal'],
        variants: [
          { ...PAD_THAI.variants![0], dietaryLabels: ['vegetarian'] },
          PAD_THAI.variants![1],
        ],
      });

      expect(component.form.value.dietaryLabels).toEqual(['halal']);
      expect(component.form.value.dietaryOptions).toEqual(['vegan']);
      expect(component.variants.at(0).value.dietaryLabels).toEqual([
        'vegetarian',
      ]);
      expect(component.variants.at(1).value.dietaryLabels).toEqual([]);
    });

    /**
     * A label diners' disputes removed is locked (issue #2198): neither
     * picker offers it on that row, and a note says why.
     */
    it('offers no removed label and says it was removed', () => {
      open({
        ...PAD_THAI,
        removedDietaryLabels: ['vegan'],
        variants: [
          { ...PAD_THAI.variants![0], removedDietaryLabels: ['halal'] },
          PAD_THAI.variants![1],
        ],
      });

      expect(component.removedLabelsOf(PAD_THAI.id)).toEqual(['vegan']);
      expect(component.removedLabelsOf('v1')).toEqual(['halal']);
      expect(component.removedLabelsOf('v2')).toEqual([]);
      expect(component.removedLabelsOf(undefined)).toEqual([]);

      const element = fixture.nativeElement as HTMLElement;
      const disabled = (testId: string): string[] =>
        Array.from(
          element.querySelectorAll<HTMLIonSelectOptionElement>(
            `[data-testid="${testId}"] ion-select-option`,
          ),
        )
          .filter((option) => option.disabled)
          .map((option) => option.value as string);

      expect(
        element.querySelector('[data-testid="dish-dietary-removed"]'),
      ).not.toBeNull();
      expect(
        element.querySelector('[data-testid="dish-variant-0-dietary-removed"]'),
      ).not.toBeNull();
      expect(
        element.querySelector('[data-testid="dish-variant-1-dietary-removed"]'),
      ).toBeNull();
      expect(component.removedLabelNames(['vegan', 'halal'])).toBe(
        'dietary-label-vegan, dietary-label-halal',
      );
      expect(disabled('dish-dietary-labels')).toEqual(['vegan']);
      expect(disabled('dish-dietary-options')).toEqual(['vegan']);
      expect(disabled('dish-variant-0-dietary-labels')).toEqual(['halal']);

      component.saveDish();

      const dish = saved.mock.calls[0][0];
      expect(dish.removedDietaryLabels).toEqual(['vegan']);
      expect(dish.variants[0].removedDietaryLabels).toEqual(['halal']);
    });

    /** Asking for a removed label back (issue #2199). */
    it('sends a restoration request apart from the dish', () => {
      const requests = jest.fn();
      component.requestRestoration.subscribe(requests);
      open({
        ...PAD_THAI,
        removedDietaryLabels: ['vegan', 'halal'],
        restorationRequestedDietaryLabels: ['halal'],
      });
      const element = fixture.nativeElement as HTMLElement;

      expect(
        element.querySelector(
          '[data-testid="dish-restoration-requested-halal"]',
        ),
      ).not.toBeNull();
      expect(
        element.querySelector('[data-testid="dish-restoration-start-halal"]'),
      ).toBeNull();

      component.startRestoration(PAD_THAI.id, 'vegan');
      fixture.detectChanges();
      expect(
        element.querySelector('[data-testid="dish-restoration-form-vegan"]'),
      ).not.toBeNull();

      component.sendRestoration(PAD_THAI.id, 'vegan');
      expect(requests).not.toHaveBeenCalled();

      component.restorationExplanation.setValue('  New supplier  ');
      component.restorationPhoto.setValue('data:image/png;base64,x');
      component.sendRestoration(PAD_THAI.id, 'vegan');

      expect(requests).toHaveBeenCalledWith({
        menuItemId: PAD_THAI.id,
        label: 'vegan',
        explanation: 'New supplier',
        photo: 'data:image/png;base64,x',
      });
      expect(component.restoring()).toBeUndefined();
      expect(saved).not.toHaveBeenCalled();
    });

    it('closes the request form on cancel, and sends no photo when none was chosen', () => {
      const requests = jest.fn();
      component.requestRestoration.subscribe(requests);
      open({ ...PAD_THAI, removedDietaryLabels: ['vegan'] });

      component.startRestoration(PAD_THAI.id, 'vegan');
      expect(component.isRestoring(PAD_THAI.id, 'vegan')).toBe(true);
      component.cancelRestoration();
      expect(component.isRestoring(PAD_THAI.id, 'vegan')).toBe(false);

      component.startRestoration(PAD_THAI.id, 'vegan');
      component.restorationExplanation.setValue('Recipe changed');
      component.sendRestoration(PAD_THAI.id, 'vegan');
      expect(requests).toHaveBeenCalledWith({
        menuItemId: PAD_THAI.id,
        label: 'vegan',
        explanation: 'Recipe changed',
      });
    });

    it('saves the labels and options on the dish and each variant', () => {
      open(PAD_THAI);
      component.form.patchValue({
        dietaryLabels: ['nut-free'],
        dietaryOptions: ['gluten-free', 'nut-free'],
      });
      component.variants.at(0).patchValue({ dietaryLabels: ['vegetarian'] });
      component.variants.at(1).patchValue({ dietaryOptions: ['halal'] });

      component.saveDish();

      const dish = saved.mock.calls[0][0];
      expect(dish.dietaryLabels).toEqual(['nut-free']);
      expect(dish.dietaryOptions).toEqual(['gluten-free']);
      expect(dish.variants[0]).toEqual(
        expect.objectContaining({ id: 'v1', dietaryLabels: ['vegetarian'] }),
      );
      expect(dish.variants[0]).not.toHaveProperty('dietaryOptions');
      expect(dish.variants[1]).toEqual(
        expect.objectContaining({ id: 'v2', dietaryOptions: ['halal'] }),
      );
    });

    it('removes labels the owner took off, on the dish and its variants', () => {
      open({
        ...PAD_THAI,
        dietaryLabels: ['halal'],
        variants: [{ ...PAD_THAI.variants![0], dietaryLabels: ['vegetarian'] }],
      });
      component.form.patchValue({ dietaryLabels: [] });
      component.variants.at(0).patchValue({ dietaryLabels: [] });

      component.saveDish();

      const dish = saved.mock.calls[0][0];
      expect(dish).not.toHaveProperty('dietaryLabels');
      expect(dish.variants[0]).not.toHaveProperty('dietaryLabels');
    });
  });

  /** One price format in every field (GitHub issue #2279). */
  describe('price fields', () => {
    it("shows a stored price with the currency's decimals", () => {
      open({ id: 'd9', name: 'Burrata', description: '', price: 11.5 });

      expect(component.form.controls.price.value).toBe('11.50');
      expect(component.variants.length).toBe(0);
    });

    it('shows each variant price the same way', () => {
      open(PAD_THAI);

      expect(component.variants.at(0).value.price).toBe('14.00');
    });

    it('saves a price typed with a comma', () => {
      open(undefined);
      component.form.patchValue({ name: 'Burrata', price: '11,50' });

      expect(component.form.valid).toBe(true);
      component.saveDish();

      expect(saved.mock.calls[0][0].price).toBe(11.5);
    });

    it('refuses a price that is not a number', () => {
      open(undefined);
      component.form.patchValue({ name: 'Burrata', price: 'elf' });

      expect(component.form.invalid).toBe(true);
    });
  });

  describe('options (#2254)', () => {
    it('shows the option groups of a dish with their choices', () => {
      open(CHOP_SUEY);

      expect(component.optionGroups.length).toBe(1);
      expect(component.optionGroups.at(0).getRawValue()).toEqual(
        CHOP_SUEY.optionGroups?.[0],
      );
      expect(component.form.valid).toBe(true);
    });

    it('keeps the option groups when other fields are saved', () => {
      open(CHOP_SUEY);
      component.form.patchValue({ price: 13.4 });

      component.saveDish();

      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 13.4,
          optionGroups: CHOP_SUEY.optionGroups,
        }),
      );
    });

    it('starts a new group as required with two empty choices', () => {
      open(undefined);

      component.addOptionGroup();

      const group = component.optionGroups.at(0);
      expect(group.controls.required.value).toBe(true);
      expect(group.controls.choices.length).toBe(2);
      expect(component.form.dirty).toBe(true);
    });

    it('saves a new group trimmed, with fresh ids', () => {
      open(undefined);
      component.form.patchValue({ name: 'Ente Spezial', price: 15.4 });
      component.addOptionGroup();
      const group = component.optionGroups.at(0);
      group.patchValue({ name: ' Spice level ', required: false });
      group.controls.choices.at(0).patchValue({ name: ' mild ' });
      group.controls.choices.at(1).patchValue({ name: 'hot' });

      component.saveDish();

      const [{ optionGroups }] = saved.mock.calls[0];
      expect(optionGroups).toEqual([
        {
          id: expect.any(String),
          name: 'Spice level',
          required: false,
          choices: [
            { id: expect.any(String), name: 'mild' },
            { id: expect.any(String), name: 'hot' },
          ],
        },
      ]);
      expect(optionGroups[0].choices[0].id).not.toBe(
        optionGroups[0].choices[1].id,
      );
    });

    it('needs a name on the group and on every choice', () => {
      open(undefined);
      component.form.patchValue({ name: 'Ente Spezial', price: 15.4 });
      component.addOptionGroup();

      expect(component.form.invalid).toBe(true);

      const group = component.optionGroups.at(0);
      group.patchValue({ name: 'Spice level' });
      group.controls.choices.at(0).patchValue({ name: 'mild' });
      expect(component.form.invalid).toBe(true);

      group.controls.choices.at(1).patchValue({ name: 'hot' });
      expect(component.form.valid).toBe(true);
    });

    it('needs at least two choices in a group, and says so', () => {
      open(CHOP_SUEY);

      component.removeChoice(0, 1);
      fixture.detectChanges();

      expect(component.form.invalid).toBe(true);
      expect(fixture.nativeElement.textContent).toContain(
        'menu-dish-option-choices-min',
      );

      component.addChoice(0);
      component.optionGroups
        .at(0)
        .controls.choices.at(1)
        .patchValue({ name: 'sehr scharf' });
      expect(component.form.valid).toBe(true);
    });

    it('drops the groups from the dish when the last one is removed', () => {
      open(CHOP_SUEY);

      component.removeOptionGroup(0);
      component.saveDish();

      expect(component.form.dirty).toBe(true);
      expect(saved.mock.calls[0][0]).not.toHaveProperty('optionGroups');
    });

    describe('reordering (#2277)', () => {
      const TWO_GROUPS: MenuItem = {
        ...CHOP_SUEY,
        optionGroups: [
          ...(CHOP_SUEY.optionGroups ?? []),
          {
            id: 'g2',
            name: 'Reis',
            required: false,
            choices: [
              { id: 'r1', name: 'weiß' },
              { id: 'r2', name: 'gebraten' },
            ],
          },
        ],
      };

      it('moves an option and saves the new order', () => {
        open(TWO_GROUPS);

        component.moveOptionGroup(1, 0);
        component.saveDish();

        expect(component.form.dirty).toBe(true);
        expect(
          saved.mock.calls[0][0].optionGroups.map(
            (group: { id: string }) => group.id,
          ),
        ).toEqual(['g2', 'g1']);
      });

      it('moves a choice within its option and saves the new order', () => {
        open(CHOP_SUEY);

        component.moveChoice(0, 0, 1);
        component.saveDish();

        expect(
          saved.mock.calls[0][0].optionGroups[0].choices.map(
            (choice: { name: string }) => choice.name,
          ),
        ).toEqual(['scharf', 'nicht scharf']);
      });

      it('ignores a move past either end', () => {
        open(TWO_GROUPS);

        component.moveOptionGroup(0, -1);
        component.moveChoice(1, 1, 2);

        expect(component.form.dirty).toBe(false);
      });

      it('turns off the first "up" and the last "down"', () => {
        open(TWO_GROUPS);
        const button = (id: string): { disabled?: boolean } | null =>
          (fixture.nativeElement as HTMLElement).querySelector(
            `[data-testid="${id}"]`,
          );

        expect(button('move-dish-option-group-up-0')?.disabled).toBe(true);
        expect(button('move-dish-option-group-down-1')?.disabled).toBe(true);
        expect(button('move-dish-option-choice-up-0-0')?.disabled).toBe(true);
        expect(button('move-dish-option-choice-down-0-1')?.disabled).toBe(true);
        expect(button('move-dish-option-group-down-0')?.disabled).toBe(false);
      });
    });

    it('renders a card per group with its choices', () => {
      open(CHOP_SUEY);

      const card: HTMLElement = fixture.nativeElement.querySelector(
        '[data-testid="dish-option-group-0"]',
      );
      expect(card).toBeTruthy();
      expect(
        card.querySelectorAll('[data-testid^="dish-option-choice-0-"]').length,
      ).toBe(2);
    });
  });

  /** See GitHub issue #2181. */
  describe('deleting the dish', () => {
    type AlertOptions = Parameters<AlertController['create']>[0];
    let alertOptions: AlertOptions | undefined;
    let present: jest.Mock;
    let deleted: jest.Mock;

    beforeEach(() => {
      present = jest.fn();
      jest
        .spyOn(TestBed.inject(AlertController), 'create')
        .mockImplementation(async (options) => {
          alertOptions = options;

          return { present } as unknown as HTMLIonAlertElement;
        });
      deleted = jest.fn();
      component.deleteDish.subscribe(deleted);
    });

    const button = (): Element | null =>
      fixture.nativeElement.querySelector('[data-testid="delete-dish"]');

    const confirmButton = (): { handler?: () => void } =>
      (alertOptions?.buttons as { role?: string; handler?: () => void }[]).find(
        (entry) => entry.role === 'destructive',
      ) ?? {};

    it('offers no delete for a dish that is not saved yet', () => {
      open(undefined);

      expect(button()).toBeNull();
    });

    it('asks first, and deletes only once the owner confirms', async () => {
      open(PAD_THAI);
      expect(button()).not.toBeNull();

      await component.confirmDelete();

      expect(present).toHaveBeenCalled();
      expect(deleted).not.toHaveBeenCalled();

      confirmButton().handler?.();

      expect(deleted).toHaveBeenCalledTimes(1);
    });

    it('says the variants go with the dish when it has any', async () => {
      open(PAD_THAI);

      await component.confirmDelete();

      expect(alertOptions?.message).toContain(
        'menu-dish-delete-confirm-message-variants',
      );
    });

    it('asks without variants for a dish that has none', async () => {
      open({ ...PAD_THAI, price: 12, variants: [] });

      await component.confirmDelete();

      expect(alertOptions?.message).toBe('menu-dish-delete-confirm-message');
    });
  });
});
