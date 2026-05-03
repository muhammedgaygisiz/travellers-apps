import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { BusinessMenuComponent } from '../business-menu.component';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import SpyInstance = jest.SpyInstance;

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

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
      const initialMenu = { categories: [] } as any;
      componentRef.setInput('menu', initialMenu);
      component.presentShowAddCategory.set(true);

      const newCategory = { title: 'Pizza', subtitle: 'Sourdough' } as any;
      component.onAddCategory(newCategory);

      expect(component.presentShowAddCategory()).toBe(false);
      expect(component.linkedMenu()?.categories).toEqual([
        { ...newCategory, index: 0 },
      ]);
    });

    it('should append a category with the next index when menu already has categories', () => {
      const initialMenu = {
        categories: [{ title: 'Pasta', index: 0 }],
      } as any;
      componentRef.setInput('menu', initialMenu);

      component.onAddCategory({ title: 'Dessert' } as any);

      expect(component.linkedMenu()?.categories).toEqual([
        { title: 'Pasta', index: 0 },
        { title: 'Dessert', index: 1 },
      ]);
    });

    it('should create a menu shape when menu is initially undefined', () => {
      componentRef.setInput('menu', undefined);

      component.onAddCategory({ title: 'Pizza' } as any);

      expect(component.linkedMenu()).toEqual({
        categories: [{ title: 'Pizza', index: 0 }],
      });
    });
  });

  describe('onSave', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.saveMenu, 'emit');
    });

    it('should emit saveMenu with the current menu', () => {
      const menu = { categories: [{ title: 'Pizza' }] } as any;
      component.linkedMenu.set(menu);

      component.onSave();

      expect(emitSpy).toHaveBeenCalledWith(menu);
    });

    it('should not emit saveMenu when menu is undefined', () => {
      component.linkedMenu.set(null as any);

      component.onSave();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onAddItemToCategory', () => {
    it('should add a new item to the matching category', () => {
      const category = { title: 'Pizza', items: [] } as any;
      const menu = { categories: [category] } as any;
      componentRef.setInput('menu', menu);

      const newItem = { name: 'Margherita', price: 8 } as any;
      component.onAddItemToCategory({ item: newItem, category });

      expect(component.linkedMenu()?.categories[0].items).toEqual([newItem]);
    });

    it('should update variants for a matching item when isVariant is true', () => {
      const category = {
        title: 'Pizza',
        items: [{ name: 'Margherita', variants: [{ name: 'S', price: 8 }] }],
      } as any;
      componentRef.setInput('menu', { categories: [category] } as any);

      component.onAddItemToCategory({
        item: {
          name: 'Margherita',
          variants: [{ name: 'L', price: 12 }],
        } as any,
        category,
        isVariant: true,
      });

      expect(component.linkedMenu()?.categories[0].items[0].variants).toEqual([
        { name: 'L', price: 12 },
      ]);
    });

    it('should keep item unchanged when isVariant is true but item name does not match', () => {
      const originalItem = {
        name: 'Margherita',
        variants: [{ name: 'S', price: 8 }],
      } as any;
      const category = {
        title: 'Pizza',
        items: [originalItem],
      } as any;
      componentRef.setInput('menu', { categories: [category] } as any);

      component.onAddItemToCategory({
        item: {
          name: 'Pepperoni',
          variants: [{ name: 'L', price: 12 }],
        } as any,
        category,
        isVariant: true,
      });

      expect(component.linkedMenu()?.categories[0].items[0]).toEqual(
        originalItem,
      );
    });

    it('should keep menu unchanged when no matching category title exists', () => {
      const existingCategory = { title: 'Pasta', items: [] } as any;
      const menu = { categories: [existingCategory] } as any;
      componentRef.setInput('menu', menu);

      component.onAddItemToCategory({
        item: { name: 'Margherita', price: 8 } as any,
        category: { title: 'Pizza' } as any,
      });

      expect(component.linkedMenu()).toEqual(menu);
    });

    it('should handle undefined menu safely', () => {
      componentRef.setInput('menu', undefined);

      component.onAddItemToCategory({
        item: { name: 'Margherita', price: 8 } as any,
        category: { title: 'Pizza' } as any,
      });

      expect(component.linkedMenu()).toBeUndefined();
    });
  });

  describe('handleReorder', () => {
    it('should reorder categories and update their indices', () => {
      componentRef.setInput('menu', {
        categories: [
          { title: 'Pizza', index: 0 },
          { title: 'Pasta', index: 1 },
          { title: 'Dessert', index: 2 },
        ],
      } as any);

      const complete = jest.fn();
      component.handleReorder({
        detail: { from: 2, to: 0, complete },
      } as any);

      expect(component.linkedMenu()?.categories).toEqual([
        { title: 'Dessert', index: 0 },
        { title: 'Pizza', index: 1 },
        { title: 'Pasta', index: 2 },
      ]);
      expect(complete).toHaveBeenCalled();
    });

    it('should call complete even when categories are missing', () => {
      componentRef.setInput('menu', {} as any);
      const complete = jest.fn();

      component.handleReorder({
        detail: { from: 0, to: 1, complete },
      } as any);

      expect(component.linkedMenu()).toEqual({});
      expect(complete).toHaveBeenCalled();
    });

    it('should keep same order when from and to indices are the same', () => {
      componentRef.setInput('menu', {
        categories: [
          { title: 'Pizza', index: 0 },
          { title: 'Pasta', index: 1 },
        ],
      } as any);
      const complete = jest.fn();

      component.handleReorder({
        detail: { from: 1, to: 1, complete },
      } as any);

      expect(component.linkedMenu()?.categories).toEqual([
        { title: 'Pizza', index: 0 },
        { title: 'Pasta', index: 1 },
      ]);
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should replace the category with the same title', () => {
      const original = { title: 'Pizza', items: [{ name: 'Old' }] } as any;
      const updated = { title: 'Pizza', items: [{ name: 'New' }] } as any;
      componentRef.setInput('menu', { categories: [original] });

      component.updateCategory(updated);

      expect(component.linkedMenu()?.categories[0]).toEqual(updated);
    });

    it('should keep menu unchanged when category title does not match', () => {
      const original = { title: 'Pizza', items: [{ name: 'Old' }] } as any;
      const menu = { categories: [original] } as any;
      componentRef.setInput('menu', menu);

      component.updateCategory({ title: 'Pasta', items: [] } as any);

      expect(component.linkedMenu()).toEqual(menu);
    });

    it('should handle undefined menu safely', () => {
      componentRef.setInput('menu', undefined);

      component.updateCategory({ title: 'Pizza', items: [] } as any);

      expect(component.linkedMenu()).toBeUndefined();
    });
  });
});
