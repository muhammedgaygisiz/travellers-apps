import { BusinessCategoryComponent } from '../business-category.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { Category } from 'model';
import SpyInstance = jest.SpyInstance;

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
    let mockMenuItem: any;
    let mockCategory: any;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.addItemToCategory, 'emit');
      mockMenuItem = { id: '1', name: 'Test Item' } as any;
      mockCategory = { id: 'cat1', items: [] } as any;
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
    let mockMenuItem: any;
    let mockCategory: any;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.categoryChanged, 'emit');
      mockMenuItem = { id: '1', name: 'Updated Item' } as any;
      mockCategory = {
        id: 'cat1',
        items: [{ id: '1', name: 'Test Item' }],
      } as any;
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
      const mockMenuItem = { id: '1', name: 'Test Item' } as any;
      component.onAddVariant(mockMenuItem);
      expect(onAddItemSpy).toHaveBeenCalledWith(mockMenuItem, true);
    });
  });

  describe('handleReorder', () => {
    let emitSpy: SpyInstance;
    let mockEvent: any;
    let mockCategory: any;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.categoryChanged, 'emit');
      mockEvent = {
        stopPropagation: jest.fn(),
        detail: {
          from: 0,
          to: 1,
          complete: jest.fn(),
        },
      } as any;
      mockCategory = {
        items: [{ id: '1' }, { id: '2' }],
      } as any;
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

    it('should not set form values if form title has value', () => {
      component.categoryForm.title().value.set('Existing');
      component.categoryForm.subtitle().value.set('Existing');
      const cat: Category = { title: 'New', subtitle: 'New', items: [] };
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.categoryForm.title().value()).toBe('Existing');
      expect(component.categoryForm.subtitle().value()).toBe('Existing');
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
