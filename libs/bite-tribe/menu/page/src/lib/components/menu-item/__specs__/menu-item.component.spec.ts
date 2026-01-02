import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { MenuItemComponent } from '../menu-item.component';
import { vi, Mock } from 'vitest';

describe('MenuItemComponent', () => {
  let component: MenuItemComponent;
  let fixture: ComponentFixture<MenuItemComponent>;
  let componentRef: ComponentRef<MenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuItemComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('shouldShowAddVariant', () => {
    it('should return true when editMode is true and presentAddVariant is true', () => {
      componentRef.setInput('editMode', true);
      component.presentAddVariant.set(true);
      expect(component.shouldShowAddVariant()).toBe(true);
    });

    it('should return false when editMode is false', () => {
      componentRef.setInput('editMode', false);
      component.presentAddVariant.set(true);
      expect(component.shouldShowAddVariant()).toBe(false);
    });

    it('should return false when presentAddVariant is false', () => {
      componentRef.setInput('editMode', true);
      component.presentAddVariant.set(false);
      expect(component.shouldShowAddVariant()).toBe(false);
    });
  });

  describe('shouldShowCreateBite', () => {
    it('should return false when editMode is true', () => {
      componentRef.setInput('editMode', true);
      expect(component.shouldShowCreateBite()).toBe(false);
    });

    it('should return false when price is 0 and variants exist', () => {
      const mockItem = { price: 0, variants: [{ id: 1 }] } as any;
      componentRef.setInput('editMode', false);
      componentRef.setInput('item', mockItem);
      expect(component.shouldShowCreateBite()).toBe(false);
    });

    it('should return true when editMode is false and price is greater than 0', () => {
      const mockItem = { price: 10, variants: [] } as any;
      componentRef.setInput('editMode', false);
      componentRef.setInput('item', mockItem);
      expect(component.shouldShowCreateBite()).toBe(true);
    });

    it('should return true when editMode is false and no variants exist', () => {
      const mockItem = { price: 0, variants: [] } as any;
      componentRef.setInput('editMode', false);
      componentRef.setInput('item', mockItem);
      expect(component.shouldShowCreateBite()).toBe(true);
    });
  });

  describe('onCreateBiteClick', () => {
    let emitSpy: Mock;

    beforeEach(() => {
      emitSpy = vi.spyOn(component.createBiteClick, 'emit');
    });

    it('should emit createBiteClick event with item data when itemData is defined', () => {
      const mockItemData = { id: 1, name: 'Test Item', price: 10 } as any;

      component.onCreateBiteClick(mockItemData);

      expect(emitSpy).toHaveBeenCalledWith(mockItemData);
    });

    it('should not emit createBiteClick event when itemData is undefined', () => {
      component.onCreateBiteClick(undefined);

      expect(emitSpy).not.toHaveBeenCalled();
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
    let emitSpy: Mock;

    beforeEach(() => {
      emitSpy = vi.spyOn(component.addedVariant, 'emit');
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
});
