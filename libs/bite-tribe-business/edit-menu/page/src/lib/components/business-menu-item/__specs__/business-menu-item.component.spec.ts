import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { BusinessMenuItemComponent } from '../business-menu-item.component';
import SpyInstance = jest.SpyInstance;

describe('BusinessMenuItemComponent', () => {
  let component: BusinessMenuItemComponent;
  let fixture: ComponentFixture<BusinessMenuItemComponent>;
  let componentRef: ComponentRef<BusinessMenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessMenuItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessMenuItemComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onItemChange', () => {
    it('should set value if item exists', () => {
      const testItem = { id: 1, name: 'Test Item' } as any;
      componentRef.setInput('item', testItem);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe(testItem.name);
    });

    it('should not set value if item does not exist', () => {
      componentRef.setInput('item', undefined);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe('');
    });
  });

  describe('shouldShowAddVariant', () => {
    it('should return true when presentAddVariant is true', () => {
      component.presentAddVariant.set(true);
      expect(component.shouldShowAddVariant()).toBe(true);
    });

    it('should return false when presentAddVariant is false', () => {
      component.presentAddVariant.set(false);
      expect(component.shouldShowAddVariant()).toBe(false);
    });
  });

  describe('onAddVariantClick', () => {
    it('should set presentAddVariant signal to true', () => {
      component.presentAddVariant.set(false);

      component.onAddVariantClick();

      expect(component.presentAddVariant()).toBe(true);
    });
  });

  describe('onAddVariant', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.addedVariant, 'emit');
    });

    it('should add variant to item and emit addedVariant event', () => {
      const initialItem = { id: 1, name: 'Test Item', variants: [] } as any;
      const newVariant = { id: 2, name: 'Variant 1' } as any;

      componentRef.setInput('item', initialItem);

      component.onAddVariant(newVariant);

      expect(component.presentAddVariant()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith({
        ...initialItem,
        variants: [newVariant],
      });
    });

    it('should not emit addedVariant event if item is undefined', () => {
      const newVariant = { id: 2, name: 'Variant 1' } as any;
      componentRef.setInput('item', undefined);

      component.onAddVariant(newVariant);

      expect(component.presentAddVariant()).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onCancelAddItem', () => {
    it('should set presentAddVariant signal to false', () => {
      component.presentAddVariant.set(true);
      component.onCancelAddItem();
      expect(component.presentAddVariant()).toBe(false);
    });
  });
});
