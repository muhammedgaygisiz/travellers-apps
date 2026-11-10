import { BusinessCategoryComponent } from '../business-category.component';
import { BusinessCategoryExtrasComponent } from '../../business-category-extras/business-category-extras.component';
import { BusinessMenuItemComponent } from '../../business-menu-item/business-menu-item.component';
import { BusinessMenuVariantComponent } from '../../business-menu-item-editor/business-menu-variant.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Category, ExtraItem, MenuItem } from 'model';
import { ItemReorderEventDetail } from '@ionic/angular';
import SpyInstance = jest.SpyInstance;

/**
 * The extras editor below the items renders Transloco keys, and this spec
 * stands up the real child rather than a stub - the merge onto
 * `categoryChanged` is the thing worth testing and a stub would not exercise
 * it. Same mock pipe the item editor's own spec uses.
 */
@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const createMenuItem = (
  overrides: Partial<MenuItem> & Record<string, unknown> = {},
): MenuItem => ({
  id: 'item-test',
  name: 'Test Item',
  description: '',
  price: 0,
  ...overrides,
});

const createCategory = (
  overrides: Partial<Category> & Record<string, unknown> = {},
): Category => ({
  id: 'category-test',
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
    })
      .overrideComponent(BusinessCategoryExtrasComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .overrideComponent(BusinessCategoryComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .overrideComponent(BusinessMenuItemComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .overrideComponent(BusinessMenuVariantComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

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

    // This used to expect `items: []` and passed only because the old title
    // effect emitted a second, stray category on load whenever the stored
    // subtitle was missing - the autosave issue #1377 removed.
    it('should start from an empty item list if the category has none', () => {
      componentRef.setInput('category', { id: 'cat1' } as unknown as Category);
      componentRef.changeDetectorRef.detectChanges();

      component.onChangeItem(mockMenuItem, 0);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith({
        id: 'cat1',
        title: '',
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

  /**
   * Extras ride the one `categoryChanged` output every other edit here goes
   * through (GitHub issue #1598). What is asserted is the merge: the block
   * changes and nothing else on the category does.
   */
  describe('onExtrasBlockChanged', () => {
    const MOZZARELLA: ExtraItem = {
      id: 'extra-mozzarella',
      name: 'Extra mozzarella',
      price: 2,
    };

    it('emits the category with the new extras block on it', () => {
      const category = createCategory({
        items: [createMenuItem()],
        subtitle: 'From the wood oven',
      });
      componentRef.setInput('category', category);
      const emitSpy: SpyInstance = jest.spyOn(
        component.categoryChanged,
        'emit',
      );

      component.onExtrasBlockChanged({
        description: 'Add to any pizza',
        extras: [MOZZARELLA],
      });

      expect(emitSpy).toHaveBeenCalledWith({
        ...category,
        extrasBlock: { description: 'Add to any pizza', extras: [MOZZARELLA] },
      });
    });

    /**
     * `undefined` is how the last extra is removed, so it has to reach the
     * emitted category as `undefined` rather than being merged away.
     */
    it('carries an emptied block through as undefined', () => {
      const category = createCategory({
        extrasBlock: { description: 'Add to any pizza', extras: [MOZZARELLA] },
      });
      componentRef.setInput('category', category);
      const emitSpy: SpyInstance = jest.spyOn(
        component.categoryChanged,
        'emit',
      );

      component.onExtrasBlockChanged(undefined);

      expect(emitSpy).toHaveBeenCalledWith({
        ...category,
        extrasBlock: undefined,
      });
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
    const cat: Category = {
      id: 'category-test',
      title: 'Test',
      subtitle: 'Sub',
      items: [],
    };

    it('should set form title and subtitle from the category', () => {
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('Test');
      expect(component.categoryForm.subtitle().value()).toBe('Sub');
      expect(component.categoryForm().dirty()).toBe(false);
    });

    it('should set form title and subtitle as empty when the category has none', () => {
      componentRef.setInput('category', { items: [] } as unknown as Category);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('');
      expect(component.categoryForm.subtitle().value()).toBe('');
    });

    it('should follow a reloaded category while nothing is edited', () => {
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      componentRef.setInput('category', { ...cat, title: 'Reloaded' });
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('Reloaded');
    });

    it('should not overwrite an edit in progress when the category reloads', () => {
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      component.categoryForm.title().value.set('Typing');
      component.categoryForm.title().markAsDirty();
      componentRef.setInput('category', { ...cat, title: 'Reloaded' });
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('Typing');
    });

    it('should keep a cleared title empty and report it as required', () => {
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      component.categoryForm.title().value.set('');
      component.categoryForm.title().markAsDirty();
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('');
      expect(component.categoryForm.title().getError('required')).toBeDefined();
      expect(component.categoryForm().valid()).toBe(false);
    });
  });

  describe('after a save', () => {
    const cat: Category = {
      id: 'category-test',
      title: 'Test',
      subtitle: 'Sub',
      items: [],
    };

    beforeEach(() => {
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
      component.categoryForm.title().value.set('Saved Title');
      component.categoryForm.title().markAsDirty();
      componentRef.changeDetectorRef.detectChanges();
    });

    // The editor re-reads the menu after a save instead of leaving (#1377).
    it('should hide Save and Cancel once the stored category holds the edit', () => {
      componentRef.setInput('category', { ...cat, title: 'Saved Title' });
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('Saved Title');
      expect(component.isTitleEdited()).toBe(false);
    });

    it('should keep the buttons when the reload does not hold the edit', () => {
      componentRef.setInput('category', { ...cat });
      componentRef.changeDetectorRef.detectChanges();

      expect(component.categoryForm.title().value()).toBe('Saved Title');
      expect(component.isTitleEdited()).toBe(true);
    });
  });

  describe('title editing', () => {
    let emitSpy: SpyInstance;
    const cat: Category = {
      id: 'category-test',
      title: 'Test',
      subtitle: 'Sub',
      items: [createMenuItem()],
    };

    beforeEach(() => {
      emitSpy = jest.spyOn(component.categoryChanged, 'emit');
      componentRef.setInput('category', cat);
      componentRef.changeDetectorRef.detectChanges();
    });

    it('should not emit while the title is being typed', () => {
      component.categoryForm.title().value.set('New Title');
      component.categoryForm.title().markAsDirty();
      componentRef.changeDetectorRef.detectChanges();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.isTitleEdited()).toBe(true);
    });

    it('should emit the category with the new title and subtitle on save', () => {
      component.categoryForm.title().value.set('New Title');
      component.categoryForm.subtitle().value.set('New Subtitle');

      component.saveTitle();

      expect(emitSpy).toHaveBeenCalledWith({
        ...cat,
        title: 'New Title',
        subtitle: 'New Subtitle',
      });
    });

    it('should not emit on save when the title is empty', () => {
      component.categoryForm.title().value.set('');

      component.saveTitle();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should put the stored title back on cancel', () => {
      component.categoryForm.title().value.set('New Title');
      component.categoryForm.title().markAsDirty();

      component.cancelTitle();

      expect(component.categoryForm.title().value()).toBe('Test');
      expect(component.isTitleEdited()).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
