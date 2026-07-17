import { BusinessCategoryComponent } from '../business-category.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { Category, MenuItem } from 'model';
import { ItemReorderEventDetail } from '@ionic/angular';
import SpyInstance = jest.SpyInstance;

const createMenuItem = (
  overrides: Partial<MenuItem> & Record<string, unknown> = {},
): MenuItem => ({
  name: 'Test Item',
  description: '',
  price: 0,
  ...overrides,
});

const createCategory = (
  overrides: Partial<Category> & Record<string, unknown> = {},
): Category => ({
  title: 'Test Category',
  items: [],
  ...overrides,
});

const createReorderEvent = (
  from: number,
  to: number,
): CustomEvent<ItemReorderEventDetail> =>
  new CustomEvent<ItemReorderEventDetail>('ionItemReorder', {
    detail: { from, to, complete: jest.fn() },
  });

describe('BusinessCategoryComponent', () => {
  let component: BusinessCategoryComponent;
  let fixture: ComponentFixture<BusinessCategoryComponent>;
  let componentRef: ComponentRef<BusinessCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessCategoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessCategoryComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('shouldShowAddItem', () => {
    it('should be true when presentShowAddItem is true', () => {
      component.presentShowAddItem.set(true);
      expect(component.shouldShowAddItem()).toBe(true);
    });

    it('should be false when presentShowAddItem is false', () => {
      component.presentShowAddItem.set(false);
      expect(component.shouldShowAddItem()).toBe(false);
    });
  });

  describe('onAddItem', () => {
    let emitSpy: SpyInstance;
    let mockMenuItem: MenuItem;
    let mockCategory: Category;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.addItemToCategory, 'emit');
      mockMenuItem = createMenuItem({ id: '1' });
      mockCategory = createCategory({ id: 'cat1' });
      componentRef.setInput('category', mockCategory);
    });

    it('should emit addItemToCategory with item and category', () => {
      component.onAddItem(mockMenuItem);
      expect(emitSpy).toHaveBeenCalledWith({
        item: mockMenuItem,
        category: mockCategory,
        isVariant: undefined,
      });
    });

    it('should not emit addItemToCategory if category is undefined', () => {
      componentRef.setInput('category', undefined);
      component.onAddItem(mockMenuItem);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should set presentShowAddItem to false', () => {
      component.presentShowAddItem.set(true);
      component.onAddItem(mockMenuItem);
      expect(component.presentShowAddItem()).toBe(false);
    });
  });

  describe('showAddItem', () => {
    it('should set presentShowAddItem to true', () => {
      component.showAddItem();
      expect(component.presentShowAddItem()).toBe(true);
    });
  });

  describe('onChangeItem', () => {
    let emitSpy: SpyInstance;
    let mockMenuItem: MenuItem;
    let mockCategory: Category;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.categoryChanged, 'emit');
      mockMenuItem = createMenuItem({ id: '1', name: 'Updated Item' });
      mockCategory = {
        id: 'cat1',
        items: [createMenuItem({ id: '1' })],
      } as unknown as Category;
      componentRef.setInput('category', mockCategory);
    });

    it('should emit categoryChanged with updated item in category', () => {
      component.onChangeItem(mockMenuItem, 0);
      expect(emitSpy).toHaveBeenCalledWith({
        ...mockCategory,
        title: mockCategory.title || '',
        items: [mockMenuItem],
      });
    });

    it('should add category items as empty array if none provided', () => {
      componentRef.setInput('category', { id: 'cat1' } as unknown as Category);
      componentRef.changeDetectorRef.detectChanges();

      component.onChangeItem(mockMenuItem, 0);

      expect(emitSpy).toHaveBeenCalledWith({
        ...mockCategory,
        title: mockCategory.title || '',
        subtitle: mockCategory.subtitle || '',
        items: [],
      });
    });
  });

  describe('onCancelAddItem', () => {
    it('should set presentShowAddItem to false', () => {
      component.presentShowAddItem.set(true);
      component.onCancelAddItem();
      expect(component.presentShowAddItem()).toBe(false);
    });
  });

  describe('onAddVariant', () => {
    let onAddItemSpy: SpyInstance;

    beforeEach(() => {
      onAddItemSpy = jest.spyOn(component, 'onAddItem');
    });

    it('should call onAddItem with isVariant true', () => {
      const parentItem = createMenuItem({ id: '1' });
      const newVariant = createMenuItem({ id: '1', name: '', price: 1 });
      component.onAddVariant(newVariant, parentItem);
      expect(onAddItemSpy).toHaveBeenCalledWith(
        {
          ...newVariant,
          name: parentItem.name,
        },
        true,
      );
    });
  });

  describe('handleReorder', () => {
    let emitSpy: SpyInstance;
    let mockEvent: CustomEvent<ItemReorderEventDetail>;
    let mockCategory: Category;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.categoryChanged, 'emit');
      mockEvent = createReorderEvent(0, 1);
      mockCategory = createCategory({
        items: [
          { id: '1' } as unknown as MenuItem,
          { id: '2' } as unknown as MenuItem,
        ],
      });
    });

    it('should emit orderingInCategoryChanged with updated category', () => {
      componentRef.setInput('category', mockCategory);

      component.handleReorder(mockEvent);

      expect(emitSpy).toHaveBeenCalledWith({
        ...mockCategory,
        items: [
          { id: '2', index: 0 },
          { id: '1', index: 1 },
        ],
      });
      expect(mockEvent.detail.complete).toHaveBeenCalled();
    });

    it('should not emit orderingInCategoryChanged if category is undefined', () => {
      componentRef.setInput('category', undefined);

      component.handleReorder(mockEvent);

      expect(emitSpy).not.toHaveBeenCalled();
      expect(mockEvent.detail.complete).toHaveBeenCalled();
    });
  });

  describe('onLinkedCategoryChange', () => {
    it('should set form title and subtitle from category when form title is empty', () => {
      component.categoryForm.title().value.set('');
      component.categoryForm.subtitle().value.set('');
      const cat: Category = { title: 'Test', subtitle: 'Sub', items: [] };
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.categoryForm.title().value()).toBe('Test');
      expect(component.categoryForm.subtitle().value()).toBe('Sub');
    });

    it('should set form title and subtitle category if provided', () => {
      const cat: Category = { title: 'Test', subtitle: 'Sub', items: [] };
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.categoryForm.title().value()).toBe('Test');
      expect(component.categoryForm.subtitle().value()).toBe('Sub');
    });

    it('should set form title and subtitle as empty when form title is empty and no title or subtitle provided', () => {
      component.categoryForm.title().value.set(null as unknown as string);
      component.categoryForm.subtitle().value.set(null as unknown as string);
      const cat = { items: [] } as unknown as Category;
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.categoryForm.title().value()).toBe('');
      expect(component.categoryForm.subtitle().value()).toBe('');
    });
  });

  describe('onTitleSubtitleChange', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.categoryChanged, 'emit');
    });

    it('should emit categoryChanged when title or subtitle changes', () => {
      const cat: Category = { title: 'Test', subtitle: 'Sub', items: [] };
      componentRef.setInput('category', cat);
      component.categoryForm.title().value.set('New Title');
      component.categoryForm.subtitle().value.set('New Subtitle');
      componentRef.changeDetectorRef.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({
        ...cat,
        title: 'New Title',
        subtitle: 'New Subtitle',
      });
    });

    it('should not emit categoryChanged if title and subtitle are unchanged', () => {
      const cat: Category = { title: 'Test', subtitle: 'Sub', items: [] };
      componentRef.setInput('category', cat);
      component.categoryForm.title().value.set('Test');
      component.categoryForm.subtitle().value.set('Sub');
      componentRef.changeDetectorRef.detectChanges();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
