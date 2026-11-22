import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, provideZonelessChangeDetection } from '@angular/core';
import {
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import type { Menu } from 'model';
import { EditMenuPage } from '../edit-menu-page.component';

addNecessaryIcons();

/**
 * The currency a menu states (GitHub issue #1102).
 *
 * Asked once at the top of the editor, because a menu is priced in one currency
 * and a control per price would invite two. The tests that matter are about
 * what the owner is offered and about "Not set" being a real answer rather than
 * an empty string the model then has to know about.
 */
describe(EditMenuPage.name, () => {
  let component: EditMenuPage;
  let fixture: ComponentFixture<EditMenuPage>;
  let componentRef: ComponentRef<EditMenuPage>;

  const MENU: Menu = {
    id: 'menu-1',
    currency: 'EUR',
    categories: [{ id: 'c1', title: 'Pizza', items: [] }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
      ],
    });

    fixture = TestBed.createComponent(EditMenuPage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  const withMenu = (menu: Menu | undefined): void => {
    componentRef.setInput('menu', menu);
    fixture.detectChanges();
  };

  it('shows the currency the menu already states', () => {
    withMenu(MENU);

    expect(component.currency()).toBe('EUR');
  });

  it('shows nothing chosen for a menu that states none', () => {
    withMenu({ ...MENU, currency: undefined });

    expect(component.currency()).toBe('');
  });

  it('saves the currency the owner chose', () => {
    withMenu({ ...MENU, currency: undefined });
    component.currency.set('JPY');

    const saved = jest.fn();
    component.saveCurrencyCode.subscribe(saved);
    component.saveCurrency();

    expect(saved).toHaveBeenCalledWith('JPY');
  });

  /**
   * "Not set" is a real answer, and the model reads a *missing field* as "not
   * stated". Only the write can express that, so the page reports the empty
   * choice and the API removes the field. Reporting a menu with the key
   * stripped said nothing at all to a merging update, which is what made
   * unsetting a silent no-op.
   */
  it('reports the empty choice when the owner unsets it', () => {
    withMenu(MENU);
    component.currency.set('');

    const saved = jest.fn();
    component.saveCurrencyCode.subscribe(saved);
    component.saveCurrency();

    expect(saved).toHaveBeenCalledWith('');
  });

  /**
   * Choosing a currency writes the currency and nothing else, so it is not a
   * menu save. Emitting one wrote back every category the editor held, and
   * routed the owner off the page while a menu save still did that.
   */
  it('never reports it as a menu save', () => {
    withMenu(MENU);
    component.currency.set('JPY');

    const savedMenu = jest.fn();
    component.saveMenu.subscribe(savedMenu);
    component.saveCurrency();

    expect(savedMenu).not.toHaveBeenCalled();
  });

  it('saves nothing when there is no menu to save', () => {
    withMenu(undefined);

    const saved = jest.fn();
    component.saveCurrencyCode.subscribe(saved);
    component.saveCurrency();

    expect(saved).not.toHaveBeenCalled();
  });

  /**
   * The device's currency is a good guess and never an answer - a chain
   * operator editing a Zurich menu from Berlin would be handed euros - so it is
   * offered first and still has to be saved.
   */
  it('offers the device currency first, and every other one after it', () => {
    const offered = component.currencies();

    expect(offered.length).toBeGreaterThan(1);
    expect(new Set(offered.map((c) => c.code)).size).toBe(offered.length);
  });

  /** One editor at a time over the list (GitHub issue #2182). */
  describe('editing', () => {
    const FULL: Menu = {
      id: 'menu-1',
      currency: 'CHF',
      categories: [
        {
          id: 'c1',
          title: 'Pizza',
          items: [{ id: 'd1', name: 'Margherita', description: '', price: 11 }],
        },
      ],
    };

    let saved: jest.Mock;

    beforeEach(() => {
      saved = jest.fn();
      component.saveMenu.subscribe(saved);
      withMenu(FULL);
    });

    it('opens the dish that was tapped, with its category', () => {
      component.openDish({ categoryId: 'c1', itemId: 'd1' });

      expect(component.editingDish()?.name).toBe('Margherita');
      expect(component.editingCategory()?.title).toBe('Pizza');
      expect(component.selectedId()).toBe('d1');
    });

    it('opens an empty dish editor to add one', () => {
      component.addDish('c1');

      expect(component.editing()).toEqual({ kind: 'dish', categoryId: 'c1' });
      expect(component.editingDish()).toBeUndefined();
    });

    it('saves a dish into the whole menu and closes once it is read back', () => {
      component.openDish({ categoryId: 'c1', itemId: 'd1' });

      component.onSaveDish({
        id: 'd1',
        name: 'Marinara',
        description: '',
        price: 9,
      });

      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              items: [expect.objectContaining({ name: 'Marinara', price: 9 })],
            }),
          ],
        }),
      );
      // Still open until the saved menu comes back...
      expect(component.editing()).toBeTruthy();

      withMenu({ ...FULL });

      // ...and closed once it has.
      expect(component.editing()).toBeUndefined();
    });

    /** See GitHub issue #2181. */
    it('deletes the open dish and closes once the menu is read back', () => {
      component.openDish({ categoryId: 'c1', itemId: 'd1' });

      component.onDeleteDish();

      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: [expect.objectContaining({ id: 'c1', items: [] })],
        }),
      );
      expect(component.editing()).toBeTruthy();

      withMenu({ ...FULL, categories: [{ ...FULL.categories[0], items: [] }] });

      expect(component.editing()).toBeUndefined();
    });

    it('deletes the open category with its dishes', () => {
      component.openCategory('c1');

      component.onDeleteCategory();

      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({ categories: [] }),
      );
    });

    it('deletes nothing for an editor that holds a new dish or category', () => {
      component.addDish('c1');
      component.onDeleteDish();
      component.addCategory();
      component.onDeleteCategory();

      expect(saved).not.toHaveBeenCalled();
    });

    it('keeps the editor open when the save is refused and nothing comes back', () => {
      component.openDish({ categoryId: 'c1', itemId: 'd1' });

      component.onSaveDish({
        id: 'd1',
        name: 'Marinara',
        description: '',
        price: 9,
      });
      fixture.detectChanges();

      expect(component.editing()).toBeTruthy();
    });

    it('adds a category and saves its details', () => {
      component.addCategory();
      component.onSaveCategory({ title: 'Pasta', subtitle: '' });

      expect(
        saved.mock.calls[0][0].categories.map(
          (c: { title: string }) => c.title,
        ),
      ).toEqual(['Pizza', 'Pasta']);
    });

    it('keeps the category editor open while extras are saved', () => {
      component.openCategory('c1');
      component.onSaveExtras({ description: 'Toppings', extras: [] });
      withMenu({ ...FULL });

      expect(component.editing()).toEqual({
        kind: 'category',
        categoryId: 'c1',
      });
      expect(saved).toHaveBeenCalled();
    });

    it('switches availability from the list without opening anything', () => {
      component.onAvailabilityChange({
        ref: { categoryId: 'c1', itemId: 'd1' },
        available: false,
      });

      expect(saved.mock.calls[0][0].categories[0].items[0].isAvailable).toBe(
        false,
      );
      expect(component.editing()).toBeUndefined();
    });

    it('saves a reordered menu', () => {
      component.onMoveCategory({ from: 0, to: 0 });
      component.onMoveDish({ categoryId: 'c1', from: 0, to: 0 });

      expect(saved).toHaveBeenCalledTimes(2);
    });

    it('closes without saving', () => {
      component.openCategory('c1');
      component.closeEditor();

      expect(component.editing()).toBeUndefined();
      expect(saved).not.toHaveBeenCalled();
    });

    it('saves nothing while there is no menu', () => {
      withMenu(undefined);
      component.addDish('c1');
      component.onSaveDish({ id: 'x', name: 'X', description: '', price: 1 });

      expect(saved).not.toHaveBeenCalled();
    });
  });

  /**
   * A menu verification built from Bites (GitHub issue #2214). The owner takes
   * it as their own on purpose, once; an edit is not that.
   */
  describe('menu built from Bites', () => {
    type AlertOptions = Parameters<AlertController['create']>[0];
    let alertOptions: AlertOptions | undefined;
    let present: jest.Mock;
    let confirmed: jest.Mock;

    const notice = (): Element | null =>
      fixture.nativeElement.querySelector(
        '[data-testid="menu-derived-notice"]',
      );

    beforeEach(() => {
      alertOptions = undefined;
      present = jest.fn();
      jest
        .spyOn(TestBed.inject(AlertController), 'create')
        .mockImplementation(async (options) => {
          alertOptions = options;

          return { present } as unknown as HTMLIonAlertElement;
        });
      confirmed = jest.fn();
      component.confirmAsOwn.subscribe(confirmed);
    });

    it('shows the notice and its button on a menu built from Bites', () => {
      withMenu({ ...MENU, derivedFromBites: true });

      expect(notice()).not.toBeNull();
      expect(
        fixture.nativeElement.querySelector('[data-testid="confirm-menu-own"]'),
      ).not.toBeNull();
    });

    it('shows nothing on a menu the restaurant wrote', () => {
      withMenu(MENU);

      expect(notice()).toBeNull();
    });

    it('asks before confirming, and confirms only on the confirm button', async () => {
      withMenu({ ...MENU, derivedFromBites: true });

      await component.confirmMenuAsOwn();

      expect(present).toHaveBeenCalled();
      expect(confirmed).not.toHaveBeenCalled();

      const buttons = alertOptions?.buttons as {
        role?: string;
        handler?: () => void;
      }[];
      expect(buttons.find(({ role }) => role === 'cancel')?.handler).toBe(
        undefined,
      );
      buttons.find(({ role }) => role === 'confirm')?.handler?.();

      expect(confirmed).toHaveBeenCalledTimes(1);
    });

    it('asks nothing on a menu that is already the restaurant’s', async () => {
      withMenu(MENU);

      await component.confirmMenuAsOwn();

      expect(present).not.toHaveBeenCalled();
    });

    it('never confirms through a menu save', () => {
      withMenu({ ...MENU, derivedFromBites: true });
      const saved = jest.fn();
      component.saveMenu.subscribe(saved);

      component.openCategory('c1');
      component.onSaveCategory({ title: 'Pizze', subtitle: '' });
      component.currency.set('CHF');
      component.saveCurrency();

      expect(saved).toHaveBeenCalled();
      expect(confirmed).not.toHaveBeenCalled();
    });
  });
});
