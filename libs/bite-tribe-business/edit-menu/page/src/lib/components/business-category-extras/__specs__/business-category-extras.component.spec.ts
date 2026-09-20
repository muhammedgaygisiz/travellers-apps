import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Category, ExtraItem } from 'model';
import {
  BusinessCategoryExtrasComponent,
  type ExtrasBlock,
} from '../business-category-extras.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const MOZZARELLA: ExtraItem = {
  id: 'extra-mozzarella',
  name: 'Extra mozzarella',
  price: 2,
};

const NDUJA: ExtraItem = { id: 'extra-nduja', name: "'Nduja", price: 2.5 };

const blockOf = (...extras: ExtraItem[]): Category['extrasBlock'] => ({
  description: 'Add to any pizza',
  extras,
});

/**
 * The owner authoring a category's extras (GitHub issue #1598).
 *
 * What is asserted is the shape of what leaves the component, because that is
 * what is saved: an id minted once and never again, a removal that is a
 * removal, and an empty block that is `undefined` rather than a heading over
 * nothing.
 */
describe(BusinessCategoryExtrasComponent.name, () => {
  let component: BusinessCategoryExtrasComponent;
  let fixture: ComponentFixture<BusinessCategoryExtrasComponent>;
  let componentRef: ComponentRef<BusinessCategoryExtrasComponent>;
  let emitted: ExtrasBlock[];

  /** The component's protected surface, as the template reaches it. */
  const editor = (): {
    showAdd(): void;
    cancelAdd(): void;
    addExtra(): void;
    removeExtra(index: number): void;
    renameExtra(index: number, name: string): void;
    repriceExtra(index: number, price: number | undefined): void;
    onDescriptionChange(description: string): void;
    canAdd(): boolean;
    newName: { set(value: string): void };
    newPrice: { set(value: number | undefined): void };
  } => component as never;

  const typeNewExtra = (name: string, price: number): void => {
    editor().showAdd();
    editor().newName.set(name);
    editor().newPrice.set(price);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessCategoryExtrasComponent],
    })
      .overrideComponent(BusinessCategoryExtrasComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BusinessCategoryExtrasComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    emitted = [];

    component.extrasBlockChanged.subscribe((block) => emitted.push(block));
  });

  const withBlock = (block: Category['extrasBlock']): void => {
    componentRef.setInput('extrasBlock', block);
    componentRef.changeDetectorRef.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('adding', () => {
    it('gives a new extra an id, a trimmed name and its price', () => {
      withBlock(undefined);
      typeNewExtra('  Extra mozzarella  ', 2);
      editor().addExtra();

      expect(emitted).toHaveLength(1);
      expect(emitted[0]?.extras).toEqual([
        { id: expect.any(String), name: 'Extra mozzarella', price: 2 },
      ]);
      expect(emitted[0]?.extras[0].id).toBeTruthy();
    });

    it('appends to the extras a category already has', () => {
      withBlock(blockOf(MOZZARELLA));
      typeNewExtra("'Nduja", 2.5);
      editor().addExtra();

      expect(emitted[0]?.extras.map((extra) => extra.name)).toEqual([
        'Extra mozzarella',
        "'Nduja",
      ]);
      expect(emitted[0]?.description).toBe('Add to any pizza');
    });

    /**
     * An extra that costs nothing is part of the dish's description rather
     * than something a guest is charged for, and a row of `0` on a bill is a
     * question the waiter has to answer.
     */
    it('refuses an extra with no name or no price', () => {
      withBlock(undefined);

      editor().showAdd();
      editor().newName.set('Extra mozzarella');
      expect(editor().canAdd()).toBe(false);

      editor().newPrice.set(0);
      expect(editor().canAdd()).toBe(false);

      editor().newPrice.set(2);
      expect(editor().canAdd()).toBe(true);

      editor().newName.set('   ');
      expect(editor().canAdd()).toBe(false);
    });

    it('clears the add row once the extra lands', () => {
      withBlock(undefined);
      typeNewExtra('Extra mozzarella', 2);
      editor().addExtra();

      expect(editor().canAdd()).toBe(false);
    });
  });

  describe('editing', () => {
    it('renames one extra and leaves its id and price alone', () => {
      withBlock(blockOf(MOZZARELLA, NDUJA));
      editor().renameExtra(0, '  Double mozzarella ');

      expect(emitted[0]?.extras).toEqual([
        { id: 'extra-mozzarella', name: 'Double mozzarella', price: 2 },
        NDUJA,
      ]);
    });

    it('reprices one extra and leaves its id and name alone', () => {
      withBlock(blockOf(MOZZARELLA, NDUJA));
      editor().repriceExtra(1, 3);

      expect(emitted[0]?.extras[1]).toEqual({ ...NDUJA, price: 3 });
    });

    /**
     * A field an owner cleared on the way to typing a new name is not an
     * instruction to unname an extra a guest may be looking at.
     */
    it('emits nothing for a blank name or a price of zero', () => {
      withBlock(blockOf(MOZZARELLA));

      editor().renameExtra(0, '   ');
      editor().repriceExtra(0, 0);
      editor().repriceExtra(0, undefined);

      expect(emitted).toEqual([]);
    });

    it('emits nothing when a field is left unchanged', () => {
      withBlock(blockOf(MOZZARELLA));

      editor().renameExtra(0, 'Extra mozzarella');
      editor().repriceExtra(0, 2);

      expect(emitted).toEqual([]);
    });

    it('keeps the extras when the description is edited', () => {
      withBlock(blockOf(MOZZARELLA));
      editor().onDescriptionChange('Add to any pasta');

      expect(emitted[0]).toEqual({
        description: 'Add to any pasta',
        extras: [MOZZARELLA],
      });
    });

    it('does not write a description onto a category with no extras', () => {
      withBlock(undefined);
      editor().onDescriptionChange('Add to any pizza');

      expect(emitted).toEqual([]);
    });
  });

  describe('removing', () => {
    it('takes one extra off and keeps the rest', () => {
      withBlock(blockOf(MOZZARELLA, NDUJA));
      editor().removeExtra(0);

      expect(emitted[0]).toEqual({
        description: 'Add to any pizza',
        extras: [NDUJA],
      });
    });

    /**
     * The field is optional on the model and absent means "this section
     * offers no extras". An empty block would be a heading over nothing that
     * every renderer would then have to decide what to do with.
     */
    it('clears the block entirely when the last extra goes', () => {
      withBlock(blockOf(MOZZARELLA));
      editor().removeExtra(0);

      expect(emitted).toEqual([undefined]);
    });
  });
});
