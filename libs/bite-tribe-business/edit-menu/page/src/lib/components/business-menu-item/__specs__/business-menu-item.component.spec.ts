import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { BusinessMenuItemComponent } from '../business-menu-item.component';
import { BusinessMenuVariantComponent } from '../../business-menu-item-editor/business-menu-variant.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { MenuItem } from 'model';
import SpyInstance = jest.SpyInstance;

const createMenuItem = (
  overrides: Partial<MenuItem> & Record<string, unknown> = {},
): MenuItem => ({
  name: 'Test Item',
  description: '',
  price: 0,
  ...overrides,
});

@Pipe({
  name: 'transloco',
})
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('BusinessMenuItemComponent', () => {
  let component: BusinessMenuItemComponent;
  let fixture: ComponentFixture<BusinessMenuItemComponent>;
  let componentRef: ComponentRef<BusinessMenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessMenuItemComponent],
    })
      .overrideComponent(BusinessMenuVariantComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .overrideComponent(BusinessMenuItemComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BusinessMenuItemComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onItemChange', () => {
    it('should set value if item exists', () => {
      const testItem = createMenuItem({ id: 1 });
      componentRef.setInput('item', testItem);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe(testItem.name);
    });

    it('should not set value if item does not exist', () => {
      componentRef.setInput('item', undefined);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe('');
    });

    it('should set value with empty name for variant', () => {
      const testItem = createMenuItem({ id: 1, name: '', price: 1 });
      componentRef.setInput('item', testItem);

      expect(component.itemForm.name().value()).toBe('');
    });
  });

  describe('name editing', () => {
    let emitSpy: SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(component.itemChanged, 'emit');
    });

    it('should not overwrite a name being typed when the item reloads', () => {
      componentRef.setInput('item', createMenuItem({ id: 'item-1' }));
      componentRef.changeDetectorRef.detectChanges();
      component.itemForm.name().value.set('Typing');
      component.itemForm.name().markAsDirty();
      componentRef.setInput(
        'item',
        createMenuItem({ id: 'item-1', name: 'Reloaded' }),
      );
      componentRef.changeDetectorRef.detectChanges();

      expect(component.itemForm.name().value()).toBe('Typing');
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit the renamed item on save, renaming variants that carry the old name', () => {
      const item = createMenuItem({
        id: 'item-1',
        name: 'Margherita',
        variants: [
          createMenuItem({ id: 'v-1', name: 'Margherita', price: 9 }),
          createMenuItem({ id: 'v-2', name: 'Family size', price: 19 }),
        ],
      });
      componentRef.setInput('item', item);
      componentRef.changeDetectorRef.detectChanges();
      component.itemForm.name().value.set('Pizza Margherita');

      component.saveName();

      expect(emitSpy).toHaveBeenCalledWith({
        ...item,
        name: 'Pizza Margherita',
        variants: [
          { ...item.variants?.[0], name: 'Pizza Margherita' },
          item.variants?.[1],
        ],
      });
    });

    it('should not emit on save when the name is empty', () => {
      componentRef.setInput('item', createMenuItem({ id: 'item-1' }));
      componentRef.changeDetectorRef.detectChanges();
      component.itemForm.name().value.set('');

      component.saveName();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.itemForm.name().getError('required')).toBeDefined();
    });

    // The editor re-reads the menu after a save instead of leaving (#1377).
    it('should hide Save and Cancel once the stored item holds the new name', () => {
      componentRef.setInput('item', createMenuItem({ id: 'item-1' }));
      componentRef.changeDetectorRef.detectChanges();
      component.itemForm.name().value.set('Renamed');
      component.itemForm.name().markAsDirty();
      componentRef.changeDetectorRef.detectChanges();

      componentRef.setInput(
        'item',
        createMenuItem({ id: 'item-1', name: 'Renamed' }),
      );
      componentRef.changeDetectorRef.detectChanges();

      expect(component.isNameEdited()).toBe(false);
    });

    it('should put the stored name back on cancel', () => {
      componentRef.setInput('item', createMenuItem({ id: 'item-1' }));
      componentRef.changeDetectorRef.detectChanges();
      component.itemForm.name().value.set('Typing');
      component.itemForm.name().markAsDirty();

      component.cancelName();

      expect(component.itemForm.name().value()).toBe('Test Item');
      expect(component.isNameEdited()).toBe(false);
    });
  });

  describe('shouldShowAddVariant', () => {
    it('should return true when presentAddVariant is true', () => {
      component.presentAddVariant.set(true);
      expect(component.showNewVariantComponent()).toBe(true);
    });

    it('should return false when presentAddVariant is false', () => {
      component.presentAddVariant.set(false);
      expect(component.showNewVariantComponent()).toBe(false);
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
      const initialItem = createMenuItem({ id: 1, variants: [] });
      const newVariant = createMenuItem({ id: 2, name: 'Variant 1' });

      componentRef.setInput('item', initialItem);

      component.onAddVariant(newVariant);

      expect(component.presentAddVariant()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith({
        ...initialItem,
        variants: [newVariant],
      });
    });

    it('should not emit addedVariant event if item is undefined', () => {
      const newVariant = createMenuItem({ id: 2, name: 'Variant 1' });
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

  describe('onEditVariant', () => {
    let itemChangedEmitSpy: SpyInstance;

    beforeEach(() => {
      itemChangedEmitSpy = jest.spyOn(component.itemChanged, 'emit');
    });

    it('should emit itemChanged event with updated item when index is not provided', () => {
      const initialItem = createMenuItem({ id: 1 });
      const changes = createMenuItem({ name: 'Updated Item' });

      componentRef.setInput('item', initialItem);

      component.onEditVariant(changes);

      expect(itemChangedEmitSpy).toHaveBeenCalledWith({
        ...initialItem,
        ...changes,
      });
    });

    it('should not emit itemChanged event if item is undefined', () => {
      const changes = createMenuItem({ name: 'Updated Item' });

      componentRef.setInput('item', undefined);

      component.onEditVariant(changes);

      expect(itemChangedEmitSpy).not.toHaveBeenCalled();
    });

    it('should not emit itemChanged event on variant if no variants provided in original item', () => {
      const initialItem = createMenuItem({ id: 1, name: 'Variant 1' });
      const changes = createMenuItem({ name: 'Updated Item' });
      componentRef.setInput('item', initialItem);
      component.onEditVariant(changes, 0);
      expect(itemChangedEmitSpy).not.toHaveBeenCalled();
    });

    it('should not emit itemChanged event on variant if no variants (empty array) provided in original item', () => {
      const initialItem = createMenuItem({
        id: 1,
        name: 'Variant 1',
        variants: [],
      });
      const changes = createMenuItem({ name: 'Updated Item' });
      componentRef.setInput('item', initialItem);
      component.onEditVariant(changes, 0);
      expect(itemChangedEmitSpy).not.toHaveBeenCalled();
    });

    it('should emit itemChanged event for variant change if index is provided', () => {
      const initialItem = createMenuItem({
        id: 1,
        name: 'Variant 1',
        variants: [{} as MenuItem],
      });
      const changes = createMenuItem({ name: 'Updated Item' });
      componentRef.setInput('item', initialItem);
      component.onEditVariant(changes, 0);
      expect(itemChangedEmitSpy).toHaveBeenCalledWith({
        ...initialItem,
        variants: [changes],
      });
    });
  });
});
