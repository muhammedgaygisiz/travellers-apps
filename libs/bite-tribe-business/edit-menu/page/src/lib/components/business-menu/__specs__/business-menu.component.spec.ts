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
  });

  describe('onSave', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.saveMenu, 'emit');
    });

    it('should emit saveMenu with the current menu', () => {
      const menu = { categories: [] } as any;
      componentRef.setInput('menu', menu);

      component.onSave();

      expect(emitSpy).toHaveBeenCalledWith(menu);
    });

    it('should not emit saveMenu when menu is undefined', () => {
      componentRef.setInput('menu', undefined);

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
  });

  describe('updateCategory', () => {
    it('should replace the category with the same title', () => {
      const original = { title: 'Pizza', items: [{ name: 'Old' }] } as any;
      const updated = { title: 'Pizza', items: [{ name: 'New' }] } as any;
      componentRef.setInput('menu', { categories: [original] });

      component.updateCategory(updated);

      expect(component.linkedMenu()?.categories[0]).toEqual(updated);
    });
  });
});
