import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Category } from 'model';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { CategoryEditorComponent } from '../category-editor.component';

addNecessaryIcons();

const PIZZA: Category = {
  id: 'c1',
  title: 'Pizza',
  subtitle: 'Wood-fired',
  items: [],
  extrasBlock: {
    description: 'Toppings',
    extras: [{ id: 'e1', name: 'Olives', price: 1.5 }],
  },
};

/** See GitHub issue #2182. */
describe(CategoryEditorComponent.name, () => {
  const setup = (
    category: Category | undefined,
  ): {
    fixture: ComponentFixture<CategoryEditorComponent>;
    component: CategoryEditorComponent;
  } => {
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

    const fixture = TestBed.createComponent(CategoryEditorComponent);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('currency', 'CHF');
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance };
  };

  it('shows the category’s title and subtitle', () => {
    const { component } = setup(PIZZA);

    expect(component.form.getRawValue()).toEqual({
      title: 'Pizza',
      subtitle: 'Wood-fired',
    });
  });

  it('saves the title and subtitle the owner typed', () => {
    const { component } = setup(PIZZA);
    const saved = jest.fn();
    component.save.subscribe(saved);

    component.form.patchValue({ title: 'Pizze', subtitle: '' });
    component.saveCategory();

    expect(saved).toHaveBeenCalledWith({
      title: 'Pizze',
      subtitle: '',
      extrasBlock: PIZZA.extrasBlock,
    });
  });

  it('saves a new category without extras', () => {
    const { component } = setup(undefined);
    const saved = jest.fn();
    component.save.subscribe(saved);

    component.form.patchValue({ title: 'Dolci' });
    component.saveCategory();

    expect(saved).toHaveBeenCalledWith({ title: 'Dolci', subtitle: '' });
  });

  it('saves no category without a title', () => {
    const { component } = setup(undefined);
    const saved = jest.fn();
    component.save.subscribe(saved);

    component.saveCategory();

    expect(saved).not.toHaveBeenCalled();
    expect(component.form.controls.title.touched).toBe(true);
  });

  /**
   * The extras are a draft until the category's Save, like its title
   * (GitHub issue #2258).
   */
  describe('the extras', () => {
    const CHANGED = {
      description: 'Toppings',
      extras: [{ id: 'e1', name: 'Olives', price: 1.8 }],
    };

    const saveButton = (
      fixture: ComponentFixture<CategoryEditorComponent>,
    ): HTMLIonButtonElement | null =>
      (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLIonButtonElement>('[data-testid="save-category"]');

    const editExtras = (
      fixture: ComponentFixture<CategoryEditorComponent>,
      block: Category['extrasBlock'],
    ): void => {
      fixture.debugElement
        .query((node) => node.name === 'business-category-extras')
        .triggerEventHandler('extrasBlockChanged', block);
      fixture.detectChanges();
    };

    it('shows the extras of a category that exists', () => {
      const { fixture } = setup(PIZZA);

      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'business-category-extras',
        ),
      ).toBeTruthy();
    });

    it('saves nothing when an extra is edited, and offers Save', () => {
      const { fixture, component } = setup(PIZZA);
      const saved = jest.fn();
      component.save.subscribe(saved);

      expect(saveButton(fixture)?.disabled).toBe(true);

      editExtras(fixture, CHANGED);

      expect(saved).not.toHaveBeenCalled();
      expect(component.extrasChanged()).toBe(true);
      expect(saveButton(fixture)?.disabled).toBe(false);
    });

    it('writes the edited extras with the category', () => {
      const { fixture, component } = setup(PIZZA);
      const saved = jest.fn();
      component.save.subscribe(saved);

      editExtras(fixture, CHANGED);
      component.saveCategory();

      expect(saved).toHaveBeenCalledWith({
        title: 'Pizza',
        subtitle: 'Wood-fired',
        extrasBlock: CHANGED,
      });
    });

    it('writes no extras block once the last extra is removed', () => {
      const { fixture, component } = setup(PIZZA);
      const saved = jest.fn();
      component.save.subscribe(saved);

      editExtras(fixture, undefined);
      component.saveCategory();

      expect(saved).toHaveBeenCalledWith({
        title: 'Pizza',
        subtitle: 'Wood-fired',
        extrasBlock: undefined,
      });
    });

    it('throws the edit away when the stored category is read again', () => {
      const { fixture, component } = setup(PIZZA);

      editExtras(fixture, CHANGED);
      fixture.componentRef.setInput('category', { ...PIZZA });
      fixture.detectChanges();

      expect(component.extrasDraft()).toEqual(PIZZA.extrasBlock);
      expect(component.extrasChanged()).toBe(false);
    });

    it('takes no edit back to unchanged as a change', () => {
      const { fixture, component } = setup(PIZZA);

      editExtras(fixture, CHANGED);
      editExtras(fixture, PIZZA.extrasBlock);

      expect(component.extrasChanged()).toBe(false);
      expect(saveButton(fixture)?.disabled).toBe(true);
    });
  });

  it('offers no extras on a category that does not exist yet', () => {
    const { fixture } = setup(undefined);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'business-category-extras',
      ),
    ).toBeNull();
  });

  it('lets the owner leave without saving', () => {
    const { fixture, component } = setup(PIZZA);
    const cancelled = jest.fn();
    component.cancelEdit.subscribe(cancelled);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('[data-testid="cancel-category"]')
      ?.click();

    expect(cancelled).toHaveBeenCalled();
  });

  /** See GitHub issue #2181. */
  describe('deleting the category', () => {
    type AlertOptions = Parameters<AlertController['create']>[0];

    const withAlert = (): {
      options: () => AlertOptions | undefined;
      present: jest.Mock;
    } => {
      let options: AlertOptions | undefined;
      const present = jest.fn();

      jest
        .spyOn(TestBed.inject(AlertController), 'create')
        .mockImplementation(async (given) => {
          options = given;

          return { present } as unknown as HTMLIonAlertElement;
        });

      return { options: () => options, present };
    };

    const deleteButton = (
      fixture: ComponentFixture<CategoryEditorComponent>,
    ): Element | null =>
      fixture.nativeElement.querySelector('[data-testid="delete-category"]');

    it('offers no delete for a category that is not saved yet', () => {
      const { fixture } = setup(undefined);

      expect(deleteButton(fixture)).toBeNull();
    });

    it('asks first, and deletes only once the owner confirms', async () => {
      const { fixture, component } = setup(PIZZA);
      const alert = withAlert();
      const deleted = jest.fn();
      component.deleteCategory.subscribe(deleted);

      expect(deleteButton(fixture)).not.toBeNull();

      await component.confirmDelete();

      expect(alert.present).toHaveBeenCalled();
      expect(deleted).not.toHaveBeenCalled();

      (alert.options()?.buttons as { role?: string; handler?: () => void }[])
        .find((entry) => entry.role === 'destructive')
        ?.handler?.();

      expect(deleted).toHaveBeenCalledTimes(1);
    });

    it('counts the dishes that go with the category', async () => {
      const { component } = setup({
        ...PIZZA,
        items: [
          { id: 'd1', name: 'Margherita', description: '', price: 11 },
          { id: 'd2', name: 'Marinara', description: '', price: 9 },
        ],
      });
      const alert = withAlert();

      await component.confirmDelete();

      expect(component.dishCount()).toBe(2);
      expect(alert.options()?.message).toContain(
        'menu-category-delete-confirm-message-dishes',
      );
    });

    it('says the extras go with a category that has extras but no dishes', async () => {
      const { component } = setup(PIZZA);
      const alert = withAlert();

      await component.confirmDelete();

      expect(alert.options()?.message).toBe(
        'menu-category-delete-confirm-message',
      );
    });

    /** No extras mentioned where there are none (GitHub issue #2260). */
    it('says a category with neither dishes nor extras is empty', async () => {
      const { component } = setup({
        ...PIZZA,
        title: 'Dolci',
        extrasBlock: undefined,
      });
      const alert = withAlert();

      await component.confirmDelete();

      expect(alert.options()?.message).toBe(
        'menu-category-delete-confirm-message-empty',
      );
    });

    it('treats an extras block with no extras as empty', async () => {
      const { component } = setup({
        ...PIZZA,
        extrasBlock: { description: 'Toppings', extras: [] },
      });
      const alert = withAlert();

      await component.confirmDelete();

      expect(alert.options()?.message).toBe(
        'menu-category-delete-confirm-message-empty',
      );
    });
  });
});
