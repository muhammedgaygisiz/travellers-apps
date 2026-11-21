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
    expect(component.variants.at(0).value.price).toBe(11);
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

  it('reads the next dish when another one is opened', () => {
    open(PAD_THAI);
    component.form.patchValue({ name: 'Edited' });

    open({ id: 'd3', name: 'Water', description: '', price: 3 });

    expect(component.form.value.name).toBe('Water');
    expect(component.variants.length).toBe(0);
    expect(component.isNew()).toBe(false);
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
