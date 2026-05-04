import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { BusinessMenuItemComponent } from '../business-menu-item.component';
import { MenuItem } from 'model';
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

  describe('onItemChange', () => {
    it('should set form name, description and price from item when form title is empty', () => {
      component.itemForm.name().value.set('');
      component.itemForm.description().value.set('');
      component.itemForm.price().value.set(10);
      const item: MenuItem = { name: 'Test', description: 'Desc', price: 100 };
      componentRef.setInput('item', item);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.itemForm.name().value()).toBe('Test');
      expect(component.itemForm.description().value()).toBe('Desc');
      expect(component.itemForm.price().value()).toBe(100);
    });

    it('should not set form values if form title has value', () => {
      component.itemForm.name().value.set('Existing');
      component.itemForm.description().value.set('Existing');
      component.itemForm.price().value.set('Existing');
      const item: MenuItem = { name: 'Test', description: 'Desc', price: 100 };
      componentRef.setInput('item', item);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.itemForm.name().value()).toBe('Existing');
      expect(component.itemForm.description().value()).toBe('Existing');
      expect(component.itemForm.price().value()).toBe('Existing');
    });
  });

  describe('onItemChange', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.itemChanged, 'emit');
    });

    it('should emit itemChanged when changes occur', () => {
      const item: MenuItem = { name: 'Name', description: 'Desc', price: 10 };
      componentRef.setInput('item', item);
      component.itemForm.name().value.set('New Name');
      component.itemForm.description().value.set('New Description');
      component.itemForm.price().value.set(100);
      componentRef.changeDetectorRef.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({
        ...item,
        name: 'New Name',
        description: 'New Description',
        price: 100,
      });
    });

    it('should not emit itemChanged if fields are unchanged', () => {
      const item: MenuItem = { name: 'Name', description: 'Desc', price: 10 };
      componentRef.setInput('item', item);
      component.itemForm.name().value.set('Name');
      component.itemForm.description().value.set('Desc');
      component.itemForm.price().value.set(10);
      componentRef.changeDetectorRef.detectChanges();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
