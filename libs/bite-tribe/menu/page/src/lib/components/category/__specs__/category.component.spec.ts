import { CategoryComponent } from '../category.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import SpyInstance = jest.SpyInstance;

describe('CategoryComponent', () => {
  let component: CategoryComponent;
  let fixture: ComponentFixture<CategoryComponent>;
  let componentRef: ComponentRef<CategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('shouldShowAddItem', () => {
    it('should be true when editMode and presentShowAddItem are true', () => {
      componentRef.setInput('editMode', true);
      component.presentShowAddItem.set(true);
      expect(component.shouldShowAddItem()).toBe(true);
    });

    it('should be false when editMode is false', () => {
      componentRef.setInput('editMode', false);
      component.presentShowAddItem.set(true);
      expect(component.shouldShowAddItem()).toBe(false);
    });

    it('should be false when presentShowAddItem is false', () => {
      componentRef.setInput('editMode', true);
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

    it('should not emit addItemToCategory if category is undefined', () => {
      componentRef.setInput('category', undefined);
      component.onAddItem(mockMenuItem);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('showAddItem', () => {
    it('should set presentShowAddItem to true', () => {
      component.showAddItem();
      expect(component.presentShowAddItem()).toBe(true);
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
      emitSpy = jest.spyOn(component.orderingInCategoryChanged, 'emit');
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
});
