import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessMenuVariantComponent } from '../business-menu-variant.component';
import { ComponentRef } from '@angular/core';
import SpyInstance = jest.SpyInstance;

describe('BusinessAddItemComponent', () => {
  let component: BusinessMenuVariantComponent;
  let fixture: ComponentFixture<BusinessMenuVariantComponent>;
  let componentRef: ComponentRef<BusinessMenuVariantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessMenuVariantComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessMenuVariantComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onItemChange', () => {
    it('should update form values when item input changes', () => {
      const newItem = {
        name: 'Test Item',
        description: 'Test Description',
        ingredients: 'Test Ingredients',
        notes: 'Test Notes',
        price: 10,
      };

      componentRef.setInput('item', newItem);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe('Test Item');
      expect(component.itemForm.description().value()).toBe('Test Description');
      expect(component.itemForm.ingredients().value()).toBe('Test Ingredients');
      expect(component.itemForm.notes().value()).toBe('Test Notes');
      expect(component.itemForm.price().value()).toBe(10);
    });

    it('should not update form values without item', () => {
      componentRef.setInput('item', undefined);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe('');
      expect(component.itemForm.description().value()).toBe('');
      expect(component.itemForm.ingredients().value()).toBe('');
      expect(component.itemForm.notes().value()).toBe('');
      expect(component.itemForm.price().value()).toBe('');
    });
  });

  describe('isAddDisabled', () => {
    it('should return true when form is invalid', () => {
      component.itemForm.name().value.set('');
      component.itemForm.price().value.set(0);

      expect(component.isAddDisabled()).toBe(true);
    });

    it('should return false when form is valid', () => {
      component.itemForm.name().value.set('test');
      component.itemForm.price().value.set(10);

      expect(component.isAddDisabled()).toBe(false);
    });
  });

  describe('isSaveDisabled', () => {
    it('should return true when form is invalid', () => {
      component.itemForm.name().value.set('');
      component.itemForm.price().value.set(0);

      expect(component.isSaveDisabled()).toBe(true);
    });

    it('should return true when form is dirty', () => {
      component.itemForm.name().value.set('test');
      component.itemForm.price().value.set(10);

      expect(component.isSaveDisabled()).toBe(true);
    });

    it('should return false when form is valid and dirty', () => {
      component.itemForm.name().value.set('test');
      component.itemForm.price().value.set(10);
      component.itemForm().markAsDirty();

      expect(component.isSaveDisabled()).toBe(false);
    });
  });

  describe('onUpdateItem', () => {
    let itemChangedEmitSpy: SpyInstance;

    beforeEach(() => {
      itemChangedEmitSpy = jest.spyOn(component.itemChanged, 'emit');
    });

    it('should emit itemChanged event if form is valid', () => {
      component.itemForm.name().value.set('New Item');
      component.itemForm.price().value.set(0);

      component.onUpdateItem();
      expect(itemChangedEmitSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit itemChanged event if form is invalid', () => {
      component.itemForm.name().value.set('New Item');

      component.onUpdateItem();
      expect(itemChangedEmitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onAddItem', () => {
    beforeEach(() => {
      jest.spyOn(component.addItem, 'emit');
    });

    it('should emit addItem event when form is valid', () => {
      component.itemForm.name().value.set('New Item');
      component.itemForm.price().value.set(0);
      component.itemForm.description().value.set('description');

      component.onAddItem();

      expect(component.addItem.emit).toHaveBeenCalledWith({
        name: 'New Item',
        description: 'description',
        ingredients: '',
        notes: '',
        price: 0,
      });
    });

    it('should not emit addItem event when form is invalid', () => {
      component.itemForm.name().value.set('');

      component.onAddItem();

      expect(component.addItem.emit).not.toHaveBeenCalled();
    });
  });

  describe('resetForm', () => {
    beforeEach(() => {
      componentRef.setInput('item', {
        name: '',
        price: 0,
      });
      component.itemForm.name().value.set('name');
      component.itemForm.description().value.set('description');
      component.itemForm.ingredients().value.set('ingredients');
      component.itemForm.notes().value.set('notes');
      component.itemForm.price().value.set('price');
    });

    it('should reset form values if item is provided', () => {
      component.resetForm();
      expect(component.itemForm.name().value()).toEqual('');
    });

    it('should not reset form values if item is missing', () => {
      componentRef.setInput('item', undefined);
      componentRef.changeDetectorRef.detectChanges();
      component.itemForm.name().value.set('name');

      component.resetForm();

      expect(component.itemForm.name().value()).toEqual('name');
    });
  });
});
