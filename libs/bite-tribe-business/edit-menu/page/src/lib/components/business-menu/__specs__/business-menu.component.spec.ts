import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { BusinessMenuComponent } from '../business-menu.component';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Category, Menu, MenuItem } from 'model';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const createReorderEvent = (
  from: number,
  to: number,
  complete: jest.Mock,
): CustomEvent<ItemReorderEventDetail> =>
  new CustomEvent<ItemReorderEventDetail>('ionItemReorder', {
    detail: { from, to, complete },
  });

describe('BusinessMenuComponent', () => {
  let component: BusinessMenuComponent;
  let fixture: ComponentFixture<BusinessMenuComponent>;
  let componentRef: ComponentRef<BusinessMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessMenuComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessMenuComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('shouldShowAddCategory', () => {
    it('should be true when presentShowAddCategory is true', () => {
      component.presentShowAddCategory.set(true);
      expect(component.shouldShowAddCategory()).toBe(true);
    });

    it('should be false when presentShowAddCategory is false', () => {
      component.presentShowAddCategory.set(false);
      expect(component.shouldShowAddCategory()).toBe(false);
    });
  });

  describe('showAddCategory', () => {
    it('should set presentShowAddCategory to true', () => {
      component.showAddCategory();
      expect(component.presentShowAddCategory()).toBe(true);
    });
  });

  describe('onCancelAddCategory', () => {
    it('should set presentShowAddCategory to false', () => {
      component.presentShowAddCategory.set(true);
      component.onCancelAddCategory();
      expect(component.presentShowAddCategory()).toBe(false);
    });
  });

  describe('onAddCategory', () => {
    it('should add the category to the menu and hide the add-category form', () => {
      const initialMenu = { categories: [] } as unknown as Menu;
      componentRef.setInput('menu', initialMenu);
      component.presentShowAddCategory.set(true);

      const newCategory = {
        title: 'Pizza',
        subtitle: 'Sourdough',
      } as unknown as Category;
      component.onAddCategory(newCategory);

      expect(component.presentShowAddCategory()).toBe(false);
      expect(component.linkedMenu()?.categories).toEqual([
        { ...newCategory, index: 0 },
      ]);
    });

    it('should append a category with the next index when menu already has categories', () => {
      const initialMenu = {
        categories: [{ title: 'Pasta', index: 0 }],
      } as unknown as Menu;
      componentRef.setInput('menu', initialMenu);

      component.onAddCategory({ title: 'Dessert' } as unknown as Category);

      expect(component.linkedMenu()?.categories).toEqual([
        { title: 'Pasta', index: 0 },
        { title: 'Dessert', index: 1 },
      ]);
    });

    it('should create a menu shape when menu is initially undefined', () => {
      componentRef.setInput('menu', undefined);

      component.onAddCategory({ title: 'Pizza' } as unknown as Category);

      expect(component.linkedMenu()).toEqual({
        categories: [{ title: 'Pizza', index: 0 }],
      });
    });

    it('should return if linkedMenu is undefined after update', () => {
      jest.spyOn(component.linkedMenu, 'update').mockReturnValue(undefined);

      component.onAddCategory({ title: 'Pizza' } as unknown as Category);

      expect(component.linkedMenu()).toBeUndefined();
    });
  });

  describe('onAddItemToCategory', () => {
    it('should add a new item to the matching category', () => {
      const category = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [],
      } as unknown as Category;
      const menu = { categories: [category] } as unknown as Menu;
      componentRef.setInput('menu', menu);

      const newItem = {
        id: 'item-margherita',
        name: 'Margherita',
        price: 8,
      } as unknown as MenuItem;
      component.onAddItemToCategory({ item: newItem, category });

      expect(component.linkedMenu()?.categories[0].items).toEqual([newItem]);
    });

    /**
     * Matching by id rather than by title is what makes this work at all: the
     * category on the menu has been renamed since the editor handed it out, and
     * before issue #1099 the addition landed nowhere.
     */
    it('should add to the right category even after it was renamed', () => {
      const category = {
        id: 'category-pizza',
        title: 'Pizze',
        items: [],
      } as unknown as Category;
      componentRef.setInput('menu', {
        categories: [category],
      } as unknown as Menu);

      const newItem = {
        id: 'item-margherita',
        name: 'Margherita',
        price: 8,
      } as unknown as MenuItem;
      component.onAddItemToCategory({
        item: newItem,
        category: { ...category, title: 'Pizza' },
      });

      expect(component.linkedMenu()?.categories[0].items).toEqual([newItem]);
    });

    it('should update variants for a matching item when isVariant is true', () => {
      const category = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [
          {
            id: 'item-margherita',
            name: 'Margherita',
            variants: [{ id: 'variant-s', name: 'S', price: 8 }],
          },
        ],
      } as unknown as Category;
      componentRef.setInput('menu', {
        categories: [category],
      } as unknown as Menu);

      component.onAddItemToCategory({
        item: {
          id: 'item-margherita',
          name: 'Margherita',
          variants: [{ id: 'variant-l', name: 'L', price: 12 }],
        } as unknown as MenuItem,
        category,
        isVariant: true,
      });

      expect(component.linkedMenu()?.categories[0].items[0].variants).toEqual([
        { id: 'variant-l', name: 'L', price: 12 },
      ]);
    });

    it('should keep item unchanged when isVariant is true but item id does not match', () => {
      const originalItem = {
        id: 'item-margherita',
        name: 'Margherita',
        variants: [{ id: 'variant-s', name: 'S', price: 8 }],
      } as unknown as MenuItem;
      const category = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [originalItem],
      } as unknown as Category;
      componentRef.setInput('menu', {
        categories: [category],
      } as unknown as Menu);

      component.onAddItemToCategory({
        item: {
          id: 'item-pepperoni',
          name: 'Pepperoni',
          variants: [{ id: 'variant-l', name: 'L', price: 12 }],
        } as unknown as MenuItem,
        category,
        isVariant: true,
      });

      expect(component.linkedMenu()?.categories[0].items[0]).toEqual(
        originalItem,
      );
    });

    /**
     * Two categories that were given the same title must stay two categories.
     * Title matching sent the addition to whichever came first.
     */
    it('should not add to a different category that shares a title', () => {
      const menu = {
        categories: [
          { id: 'category-lunch', title: 'Pizza', items: [] },
          { id: 'category-dinner', title: 'Pizza', items: [] },
        ],
      } as unknown as Menu;
      componentRef.setInput('menu', menu);

      const newItem = {
        id: 'item-margherita',
        name: 'Margherita',
        price: 8,
      } as unknown as MenuItem;
      component.onAddItemToCategory({
        item: newItem,
        category: menu.categories[1],
      });

      expect(component.linkedMenu()?.categories[0].items).toEqual([]);
      expect(component.linkedMenu()?.categories[1].items).toEqual([newItem]);
    });

    it('should keep menu unchanged when no matching category id exists', () => {
      const existingCategory = {
        id: 'category-pasta',
        title: 'Pasta',
        items: [],
      } as unknown as Category;
      const menu = { categories: [existingCategory] } as unknown as Menu;
      componentRef.setInput('menu', menu);

      component.onAddItemToCategory({
        item: {
          id: 'item-margherita',
          name: 'Margherita',
          price: 8,
        } as unknown as MenuItem,
        category: {
          id: 'category-pizza',
          title: 'Pizza',
        } as unknown as Category,
      });

      expect(component.linkedMenu()).toEqual(menu);
    });

    it('should handle undefined menu safely', () => {
      componentRef.setInput('menu', undefined);

      component.onAddItemToCategory({
        item: {
          id: 'item-margherita',
          name: 'Margherita',
          price: 8,
        } as unknown as MenuItem,
        category: {
          id: 'category-pizza',
          title: 'Pizza',
        } as unknown as Category,
      });

      expect(component.linkedMenu()).toBeUndefined();
    });
  });

  describe('handleReorder', () => {
    it('should reorder categories and update their indices', () => {
      componentRef.setInput('menu', {
        categories: [
          { id: 'category-pizza', title: 'Pizza', index: 0 },
          { id: 'category-pasta', title: 'Pasta', index: 1 },
          { id: 'category-dessert', title: 'Dessert', index: 2 },
        ],
      } as unknown as Menu);

      const complete = jest.fn();
      component.handleReorder(createReorderEvent(2, 0, complete));

      // The third acceptance criterion of issue #1099: a reorder moves the
      // index and nothing else, so every id is where it was.
      expect(component.linkedMenu()?.categories).toEqual([
        { id: 'category-dessert', title: 'Dessert', index: 0 },
        { id: 'category-pizza', title: 'Pizza', index: 1 },
        { id: 'category-pasta', title: 'Pasta', index: 2 },
      ]);
      expect(complete).toHaveBeenCalled();
    });

    it('should call complete even when categories are missing', () => {
      componentRef.setInput('menu', {} as Menu);
      const complete = jest.fn();

      component.handleReorder(createReorderEvent(0, 1, complete));

      expect(component.linkedMenu()).toEqual({});
      expect(complete).toHaveBeenCalled();
    });

    it('should keep same order when from and to indices are the same', () => {
      componentRef.setInput('menu', {
        categories: [
          { title: 'Pizza', index: 0 },
          { title: 'Pasta', index: 1 },
        ],
      } as unknown as Menu);
      const complete = jest.fn();

      component.handleReorder(createReorderEvent(1, 1, complete));

      expect(component.linkedMenu()?.categories).toEqual([
        { title: 'Pizza', index: 0 },
        { title: 'Pasta', index: 1 },
      ]);
      expect(complete).toHaveBeenCalled();
    });

    it('should return if linkedMenu is undefined after update', () => {
      jest.spyOn(component.linkedMenu, 'update').mockReturnValue(undefined);
      const complete = jest.fn();

      component.handleReorder(createReorderEvent(0, 1, complete));

      expect(component.linkedMenu()).toBeUndefined();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should replace the category with the same id', () => {
      const original = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [{ id: 'item-old', name: 'Old' }],
      } as unknown as Category;
      const updated = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [{ id: 'item-new', name: 'New' }],
      } as unknown as Category;
      componentRef.setInput('menu', { categories: [original] });

      component.updateCategory(updated);

      expect(component.linkedMenu()?.categories[0]).toEqual(updated);
    });

    /**
     * The second acceptance criterion of issue #1099, at the point it is
     * actually at risk: renaming a category is an update of that category, and
     * title matching could not tell it apart from an update of a different one.
     */
    it('should apply a rename to the category that was renamed', () => {
      const original = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [{ id: 'item-margherita', name: 'Margherita' }],
      } as unknown as Category;
      componentRef.setInput('menu', { categories: [original] });

      component.updateCategory({ ...original, title: 'Pizze' });

      expect(component.linkedMenu()?.categories[0]).toEqual({
        ...original,
        title: 'Pizze',
      });
    });

    it('should keep menu unchanged when category id does not match', () => {
      const original = {
        id: 'category-pizza',
        title: 'Pizza',
        items: [{ id: 'item-old', name: 'Old' }],
      } as unknown as Category;
      const menu = { categories: [original] } as unknown as Menu;
      componentRef.setInput('menu', menu);

      component.updateCategory({
        id: 'category-pasta',
        title: 'Pasta',
        items: [],
      });

      expect(component.linkedMenu()).toEqual(menu);
    });

    it('should handle undefined menu safely', () => {
      componentRef.setInput('menu', undefined);

      component.updateCategory({
        id: 'category-pizza',
        title: 'Pizza',
        items: [],
      });

      expect(component.linkedMenu()).toBeUndefined();
    });
  });
});
